// Run on demand: node scripts/generate-outfit-thumbnails.mjs
// Uses installed Chrome in an isolated headless context; never part of build/CI.
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { RIDER_OPTIONS } from '../src/appearance.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const assetDir = resolve(root, 'src/assets/outfits');
const representatives = {identity:'gg',skin:'cream',hat:'helmet',scarf:'long',glasses:'round',clothes:'jersey',vehicle:'bicycle'};
const server = await createServer({
  root, configFile:false, server:{host:'127.0.0.1',port:0},
  plugins:[{name:'thumbnail-page',configureServer(instance){
    instance.middlewares.use('/__outfit_thumbnails', (_req,res)=>{
      res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Outfit asset generator</title>');
    });
  }}],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({channel:'chrome',headless:true});
  const page = await browser.newPage();
  await page.goto(`${server.resolvedUrls.local[0]}__outfit_thumbnails`);
  const { images, sheet } = await page.evaluate(renderThumbnails);
  await mkdir(assetDir,{recursive:true});
  const imports=[],groups=[];
  let bytes=0,index=0;
  for(const [category,options] of Object.entries(RIDER_OPTIONS)){
    assert.deepEqual(Object.keys(images[category]),options.map(option=>option.id));
    const entries=[];
    for(const {id} of options){
      const filename=`${category}-${id}.png`, variable=`image${index++}`;
      const payload=Buffer.from(images[category][id].split(',')[1],'base64');
      assert.equal(payload.readUInt32BE(16),128);assert.equal(payload.readUInt32BE(20),128);
      await writeFile(resolve(assetDir,filename),payload);bytes+=(await stat(resolve(assetDir,filename))).size;
      imports.push(`import ${variable} from './assets/outfits/${filename}';`);
      entries.push(`${JSON.stringify(id)}: ${variable}`);
    }
    groups.push(`  ${category}: {${entries.join(', ')}},`);
  }
  const categories=Object.entries(representatives).map(([category,id])=>`  ${category}: options.${category}.${id},`).join('\n');
  await writeFile(resolve(root,'src/outfit-thumbnails.js'),
    `// Generated from actual rider models; regenerate with node scripts/generate-outfit-thumbnails.mjs\n${imports.join('\n')}\n\nconst options = {\n${groups.join('\n')}\n};\nexport const OUTFIT_THUMBNAILS = {category: {\n${categories}\n}, options};\n`);
  const sheetPath='/private/tmp/tihuqiche-outfit-contact-sheet.png';
  await writeFile(sheetPath,Buffer.from(sheet.split(',')[1],'base64'));
  // Verify Vite exposes loadable PNG files and preserves the outfit mapping.
  const mapping=await page.evaluate(async()=>{
    const {OUTFIT_THUMBNAILS:t}=await import('/src/outfit-thumbnails.js');
    const urls=[...new Set([...Object.values(t.category),...Object.values(t.options).flatMap(Object.values)])];
    await Promise.all(urls.map(async src=>{
      const url=new URL(src,location.href);
      if(url.origin!==location.origin||!url.pathname.endsWith('.png'))throw new Error(`Expected PNG file URL: ${src}`);
      const image=new Image();image.src=url.href;
      await image.decode();
      if(image.naturalWidth!==128||image.naturalHeight!==128)throw new Error(`Unexpected thumbnail dimensions: ${src}`);
    }));
    return {categories:Object.keys(t.category),options:Object.fromEntries(Object.entries(t.options).map(([k,v])=>[k,Object.keys(v)])),files:urls.length};
  });
  assert.equal(mapping.files,index);assert.deepEqual(mapping.categories,Object.keys(RIDER_OPTIONS));
  for(const [key,options] of Object.entries(RIDER_OPTIONS))assert.deepEqual(mapping.options[key],options.map(o=>o.id));
  console.log(JSON.stringify({files:index,bytes,dimensions:'128x128',mapping,sheetPath},null,2));
} finally {
  if(browser)await browser.close();
  await server.close();
}

async function renderThumbnails(){
  const T=await import('/node_modules/three/build/three.module.js');
  const {createRider}=await import('/src/rider.js');
  const {createModelPrimitives}=await import('/src/rider-primitives.js');
  const {RIDER_OPTIONS,defaultRiderConfig}=await import('/src/appearance.js');
  const scene=new T.Scene(), primitives=createModelPrimitives(scene),world={scene,...primitives};
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setSize(256,256);renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;
  scene.add(new T.HemisphereLight('#ffffff','#7c8975',2.4));
  const key=new T.DirectionalLight('#fff0d9',3.1);key.position.set(4,7,-6);scene.add(key);
  const fill=new T.DirectionalLight('#d9edff',1.2);fill.position.set(-4,3,2);scene.add(fill);
  const camera=new T.OrthographicCamera(-1,1,1,-1,.01,100);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const sheet=document.createElement('canvas');sheet.width=5*160;sheet.height=5*162;
  const sheetContext=sheet.getContext('2d');sheetContext.fillStyle='#f5f0df';sheetContext.fillRect(0,0,sheet.width,sheet.height);
  const images={};let cell=0;
  try{
    for(const [category,options] of Object.entries(RIDER_OPTIONS)){
      images[category]={};
      for(const {id} of options){
        const config={...defaultRiderConfig(),hat:'none',scarf:'none',glasses:'none',clothes:'none',[category]:id};
        const model=createRider(world,config),bird=model.rider.getObjectByName('bird');
        const head=model.rider.getObjectByName(`hat:${config.hat}`).parent;
        let subject;
        if(category==='vehicle'){
          subject=model.rider.getObjectByName(`vehicle:${id}`);
          subject.children.filter(child=>child.name.startsWith('foot:')).forEach(child=>child.removeFromParent());
        }else if(['hat','scarf','glasses'].includes(category)&&id!=='none'){
          subject=model.rider.getObjectByName(`${category}:${id}`);
        }else if(category==='hat'||category==='glasses')subject=head;
        else {
          subject=bird;
          if(category==='clothes'||category==='scarf')head.removeFromParent();
        }
        scene.updateMatrixWorld(true);scene.attach(subject);model.rider.visible=false;
        frameSubject(subject,category);
        renderer.render(scene,camera);ctx.clearRect(0,0,128,128);
        ctx.drawImage(renderer.domElement,0,0,128,128);
        const pixels=ctx.getImageData(0,0,128,128).data;
        let opaque=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>30)opaque++;
        if(opaque<100)throw new Error(`Blank model thumbnail: ${category}/${id}`);
        images[category][id]=canvas.toDataURL('image/png');
        const x=(cell%5)*160,y=Math.floor(cell/5)*162;
        sheetContext.drawImage(canvas,x+16,y+4);sheetContext.fillStyle='#173c39';sheetContext.font='12px sans-serif';
        sheetContext.textAlign='center';sheetContext.fillText(`${category} / ${id}`,x+80,y+148);cell++;
        subject.removeFromParent();model.dispose();
      }
    }
    return {images,sheet:sheet.toDataURL('image/png')};
  }finally{
    renderer.dispose();Object.values(primitives.geos).forEach(g=>g.dispose());primitives.mats.forEach(m=>m.dispose());
  }
  function frameSubject(subject,category){
    const box=new T.Box3().setFromObject(subject),center=box.getCenter(new T.Vector3());
    const direction=new T.Vector3(4,2.2,-6).normalize();
    if(category==='vehicle')direction.set(6,2.4,-4).normalize();
    camera.position.copy(center).addScaledVector(direction,15);camera.lookAt(center);camera.updateMatrixWorld(true);
    const projected=new T.Box3();
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      projected.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse));
    }
    const size=projected.getSize(new T.Vector3()),half=Math.max(size.x,size.y)*.55;
    const cx=(projected.min.x+projected.max.x)/2,cy=(projected.min.y+projected.max.y)/2;
    camera.left=cx-half;camera.right=cx+half;camera.top=cy+half;camera.bottom=cy-half;camera.updateProjectionMatrix();
  }
}
