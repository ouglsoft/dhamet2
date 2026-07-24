(function () {
  "use strict";
  function pageType() {
    const path=String(location.pathname||"");
    if(path.includes("/game")) return "game";
    if(path.includes("/loby")) return "lobby";
    if(path.includes("/mode")) return "mode";
    return "landing";
  }
  function apply() {
    if(!document.body) return;
    const mobile=matchMedia("(max-width: 900px)").matches;
    document.body.classList.toggle("z-mobile-on",mobile);
    document.body.dataset.mobilePage=pageType();
    document.body.dataset.mobileOrientation=innerWidth>innerHeight?"landscape":"portrait";
    document.documentElement.classList.remove("z-mobile-preinit");
  }
  addEventListener("resize",apply,{passive:true});
  addEventListener("orientationchange",apply,{passive:true});
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",apply,{once:true}); else apply();
  window.Mobile=Object.freeze({ refresh:apply, syncGameHeadNow:apply });
})();
