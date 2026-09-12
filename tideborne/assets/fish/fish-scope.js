(()=>{
'use strict';
if(!window.TideFishRuntime?.ready)return;
window.TideFishRuntime.ready.then(api=>{
  if(api.scope?.visual_variants_enabled===true)return;
  for(const entry of Object.values(api.renderManifest?.fish||{})){
    if(!entry||!entry.variants)continue;
    const normal=entry.variants.normal;
    entry.variants=normal?{normal}:{};
  }
}).catch(error=>console.warn('Fish Wiki render scope could not be applied.',error));
})();
