function createRect() {
  console.log('🆕 CREATING NEW RECT...');
  

  // "xNorm":0.04915,"yNorm":0.224196,"widthNorm":0.882245,"heightNorm":0.108222

  const coverRect = createLoadCoverRect({
    x: 300,  // Vị trí rõ ràng để dễ debug
    y: 200,
    width: 240,
    height: 140,
    // fill: "#ff0000", 
    fill: "#ffffff", // 🎨 ĐỔI MÀU Ở ĐÂY
    draggable: true,
    locked: false,
  });

    // ✅ Đảm bảo giá trị hợp lệ
    const xNorm = 0.037597;
    const yNorm = 0.223296;
    const widthNorm = 0.924806; // minimum width
    const heightNorm = 0.11108; // minimum height  

    // ✅ TRUYỀN ĐỦ DỮ LIỆU (bao gồm page)
    coverRect.fromRelative({
      xNorm: xNorm,
      yNorm: yNorm,
      widthNorm: widthNorm,
      heightNorm: heightNorm,
      page: 1 // ✅ THÊM PAGE VÀO ĐÂY
    });  
  
  if (coverRect && coverRect.node) {
    console.log('✅ New rect created SUCCESS:', {
      nodeId: coverRect.node.id(),
      rectWrapper: coverRect,
      position: {
        x: coverRect.node.x(),
        y: coverRect.node.y(), 
        width: coverRect.node.width(),
        height: coverRect.node.height()
      },
      page: coverRect.node.getAttr('page')
    });
    
    coverRectsArray.push(coverRect);
    
    // Debug stage ngay sau khi tạo
    setTimeout(() => {
      console.log('🔍 DEBUG after creating rect:');
      debugStageRects();
    }, 100);
  } else {
    console.error('❌ Failed to create rect - coverRect is null or missing node');
  }
}

// Clear tất cả
function clearAllCoverRects() {
  coverRectsArray.forEach((obj) => {
    try {
      // obj.destroy() đã off listener, destroy transformer & dashed & rect
      obj.destroy();
    } catch (e) {
      console.warn("clearAllCoverRects: destroy failed", e);
    }
  });
  coverRectsArray = [];
  drawingLayer.batchDraw();
}

function loadRectFromExport(rectArray, options = {}) {
  if (!rectArray || !Array.isArray(rectArray)) {
    console.warn('loadRectFromExport: rectArray is not an array or is undefined', rectArray);
    return;
  }

  var isLocked = true;
  var isDraggable = false;

  rectArray.forEach((it, i) => {
    IS_EANBLE_SWIPE = false;
    
    if (!it) {
      console.warn('loadRectFromExport: skipping null item at index', i);
      return;
    }
    
    // ✅ Đảm bảo giá trị hợp lệ
    const xNorm = Number(it.xNorm || 0);
    const yNorm = Number(it.yNorm || 0);
    const widthNorm = Number(it.widthNorm || 0.1); // minimum width
    const heightNorm = Number(it.heightNorm || 0.1); // minimum height

    const coverRect = createLoadCoverRect({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      fill: it.fill || "rgba(0,0,0,0.25)",
      stroke: it.stroke,
      strokeWidth: it.strokeWidth,
      cornerRadius: it.cornerRadius,
      locked: isLocked,
      draggable: isDraggable,
      page: it.page || 1 // ✅ TRUYỀN PAGE VÀO
    });

    // ✅ TRUYỀN ĐỦ DỮ LIỆU (bao gồm page)
    coverRect.fromRelative({
      xNorm: xNorm,
      yNorm: yNorm,
      widthNorm: widthNorm,
      heightNorm: heightNorm,
      page: it.page || 1 // ✅ THÊM PAGE VÀO ĐÂY
    });

    coverRectsArray.push(coverRect);
    
    console.log('📦 Loaded rect:', {
      page: it.page,
      position: { xNorm, yNorm },
      size: { widthNorm, heightNorm }
    });
  });

  drawingLayer.batchDraw();
}





/**
 * createCoverRect(opts)
 * - opts: { x, y, width, height, fill, stroke, strokeWidth, cornerRadius, padding, draggable, keepAspect }
 * Returns API: { node, transformer, toRelative, fromRelative, fitToRect, setStyle, destroy }
 */
function createLoadCoverRect(opts = {}) {


  if (!stage || !drawingLayer || !backgroundImage) {
    console.warn("createLoadCoverRect: stage/drawingLayer/backgroundImage required");
    return null;
  }

  console.log('🆕 createLoadCoverRect CALLED with opts:', opts);  

  // ✅ THÊM: Đảm bảo background đã sẵn sàng
  if (!backgroundImage.image() || backgroundImage.width() === 0) {
    console.warn("createLoadCoverRect: backgroundImage not ready");
    return null;
  }

  const padding = opts.padding ?? 6;
  const fill = typeof opts.fill !== "undefined" ? opts.fill : "rgba(0,0,0,0.25)";
  const stroke = opts.stroke ?? "#ffffff";
  const strokeWidth = typeof opts.strokeWidth === "number" ? opts.strokeWidth : 1;
  const cornerRadius = opts.cornerRadius ?? 6;
  const draggable = typeof opts.draggable === "boolean" ? opts.draggable : true;
  const keepAspect = !!opts.keepAspect;
  let isLocked = !!opts.locked;

  const rect = new Konva.Rect({
    x: Number(opts.x ?? 50),
    y: Number(opts.y ?? 50),
    width: Number(opts.width ?? 120),
    height: Number(opts.height ?? 80),
    fill,
    stroke,
    strokeWidth,
    cornerRadius,
    draggable: !isLocked && (typeof opts.draggable === 'boolean' ? opts.draggable : true),
    listening: !isLocked,
    name: "maskRect",
    id: `rect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // ✅ THÊM ID DUY NHẤT
  });




  // ✅ THÊM: Kiểm tra tính toán page
  const initialPage = opts.page || getCurrentPageForPoint(rect.x(), rect.y());
  rect.setAttr('page', initialPage);
  
  console.log('🆕 createLoadCoverRect DEBUG:', {
    initialPosition: { x: rect.x(), y: rect.y(), width: rect.width(), height: rect.height() },
    initialPage: initialPage,
    isDualPage: isTwoPage(),
    backgroundSize: { width: backgroundImage.width(), height: backgroundImage.height() }
  });
  
  console.log('🆕 createLoadCoverRect DEBUG:', {
    initialPosition: { x: rect.x(), y: rect.y(), width: rect.width(), height: rect.height() },
    initialPage: initialPage,
    isDualPage: isTwoPage()
  });

  const dashed = new Konva.Rect({
    x: rect.x(),
    y: rect.y(),
    width: rect.width(),
    height: rect.height(),
    stroke: "#000",
    dash: [6, 4],
    visible: false,
    listening: false,
  });

  // Sau khi tạo rect, thêm debug
  console.log('✅ Rect created successfully:', {
    rectId: rect.id(),
    position: { x: rect.x(), y: rect.y(), width: rect.width(), height: rect.height() },
    page: rect.getAttr('page')
  });    

  drawingLayer.add(rect);
  drawingLayer.add(dashed);

 // luôn tạo transformer, nhưng sẽ disable/hidden nếu locked
  const defaultAnchors = keepAspect
    ? ["top-left", "top-right", "bottom-left", "bottom-right"]
    : [
        "top-left","top-center","top-right",
        "middle-left","middle-right",
        "bottom-left","bottom-center","bottom-right"
      ];


  const tr = new Konva.Transformer({
    node: rect,
    enabledAnchors: isLocked ? [] : defaultAnchors,
    rotateEnabled: isLocked ? false : true,
    keepRatio: keepAspect,
    boundBoxFunc: (oldBox, newBox) => {
      newBox.width = Math.max(6, Math.round(newBox.width));
      newBox.height = Math.max(6, Math.round(newBox.height));
      newBox.rotation = 0;
      return newBox;
    },
    anchorSize: 8,
    anchorFill: "#fff",
    anchorStroke: "#444",
    borderStroke: "rgba(0,0,0,0.2)",
    borderStrokeWidth: 1,
  });
  drawingLayer.add(tr);

    // --- thêm reference ngược để delete dễ dàng ---
  rect._transformer = tr;
  rect._dashed = dashed;

  function destroy() {
    try { tr.destroy(); } catch (e) {}
    try { dashed.destroy(); } catch (e) {}
    try { rect.destroy(); } catch (e) {}
    // off chỉ khi onStagePointerDown có tồn tại
    try {
      if (typeof onStagePointerDown === 'function' && stage) {
        stage.off("contentMouseDown contentTouchStart", onStagePointerDown);
      }
    } catch (e) {}
    drawingLayer.batchDraw();
  }

  function syncDashed() {
    dashed.position({ x: rect.x(), y: rect.y() });
    dashed.width(rect.width());
    dashed.height(rect.height());
  }

rect.on("dragend", () => {
  if (isLocked) return;
  
  // ✅ Cập nhật page khi di chuyển (chỉ desktop mode)
  if (isTwoPage()) {
    const newX = rect.x();
    const newY = rect.y();
    const newPage = getCurrentPageForPoint(newX, newY);
    const oldPage = rect.getAttr('page');
    
    if (newPage !== oldPage) {
      console.log(`📦 Rect moved: page ${oldPage} → ${newPage}`);
      rect.setAttr('page', newPage);
    }
  }
  
  syncDashed();
  drawingLayer.batchDraw();
});


  // show transformer + dashed on dblclick/dbltap
  rect.on("dbltap dblclick", () => {
  if (isLocked) return;
  tr.nodes([rect]);
  tr.visible(true);
  tr.forceUpdate();
  dashed.visible(true);
  drawingLayer.batchDraw();
  });

// SỬA THÀNH:
tr.on("dragend transformend", () => {
  if (isLocked) return;
  
  console.log('🔄 TRANSFORM END - Current state:', {
    width: rect.width(),
    height: rect.height(), 
    scaleX: rect.scaleX(),
    scaleY: rect.scaleY()
  });
  
  // ✅ RESET SCALE và cập nhật kích thước thực tế
  const scaleX = rect.scaleX();
  const scaleY = rect.scaleY();
  
  if (scaleX !== 1 || scaleY !== 1) {
    // Áp dụng scale vào width/height thực tế
    rect.width(rect.width() * scaleX);
    rect.height(rect.height() * scaleY);
    // Reset scale về 1
    rect.scaleX(1);
    rect.scaleY(1);
    
    console.log('✅ Scale reset - new actual size:', {
      width: rect.width(),
      height: rect.height()
    });
  }
  
  // ✅ Cập nhật page khi di chuyển/resize
  if (isTwoPage()) {
    const newX = rect.x();
    const newY = rect.y();
    const newPage = getCurrentPageForPoint(newX, newY);
    const oldPage = rect.getAttr('page');
    
    if (newPage !== oldPage) {
      console.log(`📦 Rect moved/resized: page ${oldPage} → ${newPage}`);
      rect.setAttr('page', newPage);
    }
  }
  
  syncDashed();
  drawingLayer.batchDraw();
});

// TRONG createLoadCoverRect - SỬA PHẦN TRANSFORMER:

// --- Rotate icon mở color popup (giống text) ---
tr.on("mousedown touchstart", function (evt) {
  if (isLocked) return;

  const target = evt.target;
  
  // 🔴 ROTATER = ĐỔI MÀU (giống text)
  const isRotater =
    (typeof target.name === "function" && target.name() === "rotater") ||
    (typeof target.hasName === "function" && target.hasName("rotater"));
  
  if (isRotater) {
    evt.cancelBubble = true;
    evt.evt?.preventDefault?.();
    showColorisPopupForRect(rect);
    return;
  }

  // 🗑️ TOP-LEFT CORNER = XÓA (dễ nhớ)
  const isTopLeft =
    (typeof target.name === "function" && target.name() === "top-left") ||
    (typeof target.hasName === "function" && target.hasName("top-left"));
  
  if (isTopLeft) {
    evt.cancelBubble = true;
    evt.evt?.preventDefault?.();
    
    if (confirm('Bạn có muốn xóa rect này không?')) {
      console.log('🗑️ Deleting rect via top-left corner:', rect.id());
      deleteCoverRect(rect);
    }
    return;
  }
});

  // sync while moving/resizing
  rect.on("dragmove transform move", () => {
    if (isLocked) return;

    syncDashed();
    drawingLayer.batchDraw();
  });


  function toRelative() {
  const bgX = backgroundImage.x();
  const bgY = backgroundImage.y();
  const bgW = backgroundImage.width();
  const bgH = backgroundImage.height();
  
  // ✅ LẤY KÍCH THƯỚC THỰC TẾ (tính cả scale)
  const rectAbs = rect.getClientRect();
  const x = rectAbs.x;
  const y = rectAbs.y;
  const w = rectAbs.width;
  const h = rectAbs.height;

  console.log('📊 toRelative ACTUAL SIZE:', {
    rectSize: { width: rect.width(), height: rect.height() },
    rectScale: { scaleX: rect.scaleX(), scaleY: rect.scaleY() },
    actualSize: { w, h },
    rectAbs
  });

  // ✅ Xác định mode và page width
  const isDualPage = isTwoPage();
  const pageDisplayWidth = isDualPage ? bgW / 2 : bgW;
  const rectPage = rect.getAttr('page') || 1;

  let xNorm, yNorm, widthNorm, heightNorm;

  if (isDualPage) {
    // ✅ DESKTOP MODE: Normalize theo PAGE width
    const pageStartX = (rectPage === 1) ? 0 : pageDisplayWidth;
    const relativeX = x - bgX - pageStartX;
    
    xNorm = pageDisplayWidth ? Number((relativeX / pageDisplayWidth).toFixed(6)) : 0;
    yNorm = bgH ? Number(((y - bgY) / bgH).toFixed(6)) : 0;
    widthNorm = pageDisplayWidth ? Number((w / pageDisplayWidth).toFixed(6)) : 0;
    heightNorm = bgH ? Number((h / bgH).toFixed(6)) : 0;
  } else {
    // ✅ MOBILE MODE: Normalize theo toàn bộ background width
    xNorm = bgW ? Number(((x - bgX) / bgW).toFixed(6)) : 0;
    yNorm = bgH ? Number(((y - bgY) / bgH).toFixed(6)) : 0;
    widthNorm = bgW ? Number((w / bgW).toFixed(6)) : 0;
    heightNorm = bgH ? Number((h / bgH).toFixed(6)) : 0;
  }

  console.log('📊 toRelative FINAL:', {
    page: rectPage,
    isDualPage: isDualPage,
    actualSize: { w, h },
    normalized: { xNorm, yNorm, widthNorm, heightNorm }
  });

  return { xNorm, yNorm, widthNorm, heightNorm };
}

function fromRelative(obj = {}) {
  if (!obj) {
    console.warn('❌ fromRelative: obj is null or undefined');
    return;
  }
  
  console.log('🔧 fromRelative CALLED with:', obj);
  
  const bgX = backgroundImage.x();
  const bgY = backgroundImage.y();
  const bgW = backgroundImage.width();
  const bgH = backgroundImage.height();

  // ✅ Xác định mode và page width (GIỐNG TEXT & LINES)
  const isDualPage = isTwoPage();
  const pageDisplayWidth = isDualPage ? bgW / 2 : bgW;
  
  // ✅ Xác định page của rect này
  const rectPage = obj.page || rect.getAttr('page') || 1;

  console.log('🔧 fromRelative DEBUG - BEFORE CALC:', {
    rectId: rect.id(),
    rectPage,
    isDualPage,
    bgDisplay: { bgX, bgY, bgW, bgH },
    pageDisplayWidth,
    input: obj
  });

  let xAbs, yAbs, wAbs, hAbs;

  if (isDualPage) {
    // ✅ DESKTOP MODE: Tính toán theo PAGE width
    const pageStartX = (rectPage === 1) ? 0 : pageDisplayWidth;
    
    xAbs = bgX + pageStartX + (obj.xNorm || 0) * pageDisplayWidth;
    yAbs = bgY + (obj.yNorm || 0) * bgH;
    wAbs = (obj.widthNorm || 0) * pageDisplayWidth;
    hAbs = (obj.heightNorm || 0) * bgH;
    
    console.log('🔧 fromRelative DESKTOP CALC:', {
      pageStartX,
      xNorm: obj.xNorm,
      calculated: { xAbs, yAbs, wAbs, hAbs }
    });
  } else {
    // ✅ MOBILE MODE: Tính toán theo toàn bộ background width
    xAbs = bgX + (obj.xNorm || 0) * bgW;
    yAbs = bgY + (obj.yNorm || 0) * bgH;
    wAbs = (obj.widthNorm || 0) * bgW;
    hAbs = (obj.heightNorm || 0) * bgH;
    
    console.log('🔧 fromRelative MOBILE CALC:', {
      calculated: { xAbs, yAbs, wAbs, hAbs }
    });
  }

  console.log('🔧 fromRelative FINAL POSITION:', {
    rectId: rect.id(),
    position: { x: Math.round(xAbs), y: Math.round(yAbs) },
    size: { width: Math.round(wAbs), height: Math.round(hAbs) }
  });

  rect.position({ x: Math.round(xAbs), y: Math.round(yAbs) });
  rect.scaleX(1);
  rect.scaleY(1);
  rect.width(Math.max(2, Math.round(wAbs)));
  rect.height(Math.max(2, Math.round(hAbs)));
  rect.rotation(0);

  // ✅ CẬP NHẬT PAGE ATTRIBUTE
  if (obj.page) {
    rect.setAttr('page', obj.page);
    console.log('✅ Updated rect page to:', obj.page);
  }

  syncDashed();
  try {
    tr.forceUpdate();
  } catch (e) {}
  drawingLayer.batchDraw();
  
  console.log('✅ fromRelative COMPLETED for rect:', rect.id());
}




  // fit to absolute rect (x,y,w,h) — tiện khi bạn muốn snap cover lên một vùng cụ thể
  function fitToRect(absRect = {}) {
    if (!absRect) return;
    rect.position({
      x: Math.round(absRect.x || rect.x()),
      y: Math.round(absRect.y || rect.y()),
    });
    rect.width(Math.round(absRect.width || rect.width()));
    rect.height(Math.round(absRect.height || rect.height()));
    syncDashed();
    try {
      tr.forceUpdate();
    } catch (e) {}
    drawingLayer.batchDraw();
  }

  function setStyle(style = {}) {
    if (typeof style.fill !== "undefined") rect.fill(style.fill);
    if (typeof style.stroke !== "undefined") rect.stroke(style.stroke);
    if (typeof style.strokeWidth !== "undefined")
      rect.strokeWidth(style.strokeWidth);
    if (typeof style.cornerRadius !== "undefined")
      rect.cornerRadius(style.cornerRadius);
    drawingLayer.batchDraw();
  }

  // function destroy() {
  //   try {
  //     tr.destroy();
  //   } catch (e) {}
  //   try {
  //     dashed.destroy();
  //   } catch (e) {}
  //   try {
  //     rect.destroy();
  //   } catch (e) {}
  //   // stage.off("contentMouseDown contentTouchStart", onStagePointerDown);
  //   drawingLayer.batchDraw();
  // }

   // lock/unlock API
  function lock() {
    if (isLocked) return;
    isLocked = true;
    // disable interactions
    rect.draggable(false);
    rect.listening(false); // không bắt sự kiện chuột/touch
    dashed.visible(false);
    if (tr) {
      try {
        tr.nodes([]);
        tr.enabledAnchors([]);
        tr.visible(false);
      } catch (e) {}
    }
    drawingLayer.batchDraw();
  }

  function unlock() {
    if (!isLocked) return;
    isLocked = false;
    rect.draggable(Boolean(opts.draggable !== false)); // restore default draggable setting
    rect.listening(true);
    if (tr) {
      try {
        tr.enabledAnchors(defaultAnchors.slice());
        tr.nodes([]); // vẫn ẩn transformer cho tới khi dblclick
        tr.visible(false);
      } catch (e) {}
    }
    drawingLayer.batchDraw();
  }

  // initial sync + draw
  syncDashed();


  drawingLayer.batchDraw();

  return {
    node: rect,
    transformer: tr,
    dashed,
    toRelative,
    fromRelative,
    fitToRect,
    setStyle,
    destroy,
    lock,
    unlock,
    isLocked: () => Boolean(isLocked),    
  };
}

function deleteCoverRect(target) {
  console.log('🗑️ deleteCoverRect called with:', target);
  
  if (!target) {
    console.warn('❌ deleteCoverRect: target is null');
    return false;
  }

  // 1) Nếu là wrapper object từ createLoadCoverRect
  if (typeof target === 'object' && typeof target.destroy === 'function' && target.node) {
    try {
      console.log('🗑️ Deleting via wrapper object:', target.node.id());
      
      // Remove từ mảng global
      const idx = coverRectsArray.indexOf(target);
      if (idx !== -1) {
        coverRectsArray.splice(idx, 1);
        console.log('✅ Removed from coverRectsArray');
      }
      
      // Gọi destroy của wrapper (sẽ destroy tất cả)
      target.destroy();
      drawingLayer.batchDraw();
      
      console.log('✅ Rect deleted successfully via wrapper');
      return true;
    } catch (e) {
      console.error('❌ deleteCoverRect: wrapper destroy failed', e);
      return false;
    }
  }

  // 2) Nếu là Konva node (rect)
  if (typeof target === 'object' && typeof target.getClassName === 'function') {
    try {
      const node = target;
      console.log('🗑️ Deleting via Konva node:', node.id(), node.name());
      
      // 🔥 QUAN TRỌNG: Tìm và xóa transformer
      if (node._transformer) {
        console.log('✅ Found _transformer reference, destroying...');
        try {
          node._transformer.destroy();
          node._transformer = null;
        } catch (e) {
          console.warn('❌ Failed to destroy _transformer:', e);
        }
      } else {
        // Fallback: tìm transformers trên layer
        console.log('⚠️ No _transformer reference, searching in layer...');
        const transformers = drawingLayer.find('Transformer');
        transformers.forEach(tr => {
          try {
            const nodes = tr.nodes ? tr.nodes() : [];
            if (nodes.includes(node)) {
              console.log('✅ Found transformer in layer, destroying...');
              tr.destroy();
            }
          } catch (e) {
            console.warn('❌ Error checking transformer:', e);
          }
        });
      }

      // 🔥 Xóa dashed rect
      if (node._dashed) {
        console.log('✅ Found _dashed reference, destroying...');
        try {
          node._dashed.destroy();
          node._dashed = null;
        } catch (e) {
          console.warn('❌ Failed to destroy _dashed:', e);
        }
      } else {
        // Fallback: tìm dashed rects
        const dashedRects = drawingLayer.find('Rect').filter(r => {
          try {
            const dash = r.dash ? r.dash() : [];
            return Array.isArray(dash) && dash.length > 0;
          } catch (e) {
            return false;
          }
        });
        
        dashedRects.forEach(dashed => {
          try {
            if (Math.abs(dashed.x() - node.x()) < 2 && 
                Math.abs(dashed.y() - node.y()) < 2 &&
                Math.abs(dashed.width() - node.width()) < 2 &&
                Math.abs(dashed.height() - node.height()) < 2) {
              console.log('✅ Found matching dashed rect, destroying...');
              dashed.destroy();
            }
          } catch (e) {
            console.warn('❌ Error checking dashed rect:', e);
          }
        });
      }

      // 🔥 Remove từ coverRectsArray nếu có
      if (Array.isArray(window.coverRectsArray)) {
        for (let i = coverRectsArray.length - 1; i >= 0; i--) {
          const wrapper = coverRectsArray[i];
          if (wrapper && wrapper.node === node) {
            console.log('✅ Removing wrapper from coverRectsArray');
            coverRectsArray.splice(i, 1);
            break;
          }
        }
      }

      // 🔥 Cuối cùng destroy node chính
      console.log('✅ Destroying main rect node...');
      node.destroy();
      
      drawingLayer.batchDraw();
      console.log('✅ Rect deleted successfully via node');
      return true;
    } catch (e) {
      console.error('❌ deleteCoverRect: node destroy failed', e);
      return false;
    }
  }

  console.warn('❌ deleteCoverRect: invalid target type', target);
  return false;
}


function saveCoverRects(bgDisplay = null, isPage1 = true, isDualPage = false, pageDisplayWidth = null) {
  // ✅ NHẬN THAM SỐ GIỐNG TEXT (để xử lý filter theo page)
  if (!bgDisplay) {
    bgDisplay = {
      x: backgroundImage.x(),
      y: backgroundImage.y(),
      width: backgroundImage.width(),
      height: backgroundImage.height()
    };
  }
  
  if (isDualPage === undefined) {
    isDualPage = isTwoPage();
  }
  
  if (!pageDisplayWidth) {
    pageDisplayWidth = isDualPage ? bgDisplay.width / 2 : bgDisplay.width;
  }

  const nodes = drawingLayer.find('.maskRect');
  const targetPage = isDualPage ? (isPage1 ? 1 : 2) : null;

  console.log('🔍 saveCoverRects START:', {
    totalRects: nodes.length,
    isDualPage,
    targetPage,
    bgDisplay,
    pageDisplayWidth
  });

  const items = nodes.map((node, index) => {
    const x = node.x();
    const y = node.y();
    const width = node.width();
    const height = node.height();
    
    // ✅ Lấy page của rect
    const rectPage = node.getAttr('page') || 1;

    const rectAbs = node.getClientRect();    
    console.log(`💾 Saving rect ${index}:`, {
      nodeId: node.id(),
      directSize: { width: node.width(), height: node.height() },
      scale: { scaleX: node.scaleX(), scaleY: node.scaleY() },
      actualSize: { width: rectAbs.width, height: rectAbs.height },
      position: { x: node.x(), y: node.y() }
    });

    // ✅ FILTER: Trong desktop mode, chỉ lấy rects thuộc page đang export
    if (isDualPage && targetPage && rectPage !== targetPage) {
      console.log(`❌ Skipping rect ${index} - wrong page: ${rectPage} vs ${targetPage}`);
      return null; // Skip rects không thuộc page này
    }

    let xNorm, yNorm, widthNorm, heightNorm;

    if (isDualPage) {
      // ✅ DESKTOP MODE: Normalize theo PAGE width
      const pageStartX = (rectPage === 1) ? 0 : pageDisplayWidth;
      const relativeX = x - bgDisplay.x - pageStartX;
      
      xNorm = pageDisplayWidth ? Number((relativeX / pageDisplayWidth).toFixed(6)) : 0;
      yNorm = bgDisplay.height ? Number(((y - bgDisplay.y) / bgDisplay.height).toFixed(6)) : 0;
      widthNorm = pageDisplayWidth ? Number((width / pageDisplayWidth).toFixed(6)) : 0;
      heightNorm = bgDisplay.height ? Number((height / bgDisplay.height).toFixed(6)) : 0;
    } else {
      // ✅ MOBILE MODE: Normalize theo toàn bộ background width
      xNorm = bgDisplay.width ? Number(((x - bgDisplay.x) / bgDisplay.width).toFixed(6)) : 0;
      yNorm = bgDisplay.height ? Number(((y - bgDisplay.y) / bgDisplay.height).toFixed(6)) : 0;
      widthNorm = bgDisplay.width ? Number((width / bgDisplay.width).toFixed(6)) : 0;
      heightNorm = bgDisplay.height ? Number((height / bgDisplay.height).toFixed(6)) : 0;
    }

    const data = {
      xNorm,
      yNorm,
      widthNorm,
      heightNorm,
      page: rectPage,
      fill: node.fill?.() ?? null,
      stroke: node.stroke?.() ?? null,
      strokeWidth: node.strokeWidth?.() ?? null,
      cornerRadius: node.cornerRadius?.() ?? null,
      draggable: node.draggable?.() ?? true,
      name: node.name?.() ?? null,
      id: node.id?.() ?? null,
    };

    console.log(`✅ Keeping rect ${index}:`, {
      page: data.page,
      normalized: { xNorm, yNorm, widthNorm, heightNorm }
    });

    return data;
  }).filter(item => item !== null); // ✅ Lọc bỏ null items

  console.log(`💾 saveCoverRects COMPLETE: ${items.length} rects saved`);
  return items;
}

// THÊM hàm này vào file
function updateRectPage() {
  if (!isTwoPage()) return;
  
  const rect = this.node; // hoặc lấy rect từ context
  const newX = rect.x();
  const newY = rect.y();
  const newPage = getCurrentPageForPoint(newX, newY);
  const oldPage = rect.getAttr('page');
  
  if (newPage !== oldPage) {
    console.log(`📦 Rect page updated: ${oldPage} → ${newPage}`);
    rect.setAttr('page', newPage);
  }
  
  syncDashed();
  drawingLayer.batchDraw();
}


// Thêm vào konva_rect_util.js
function debugStageRects() {
  if (!drawingLayer) {
    console.warn('❌ No drawingLayer for debug');
    return;
  }
  
  const rects = drawingLayer.find('.maskRect');
  console.log('🔍 DEBUG Stage Rects:', {
    total: rects.length,
    details: rects.map((rect, index) => ({
      index,
      id: rect.id(),
      className: rect.className,
      name: rect.name(),
      page: rect.getAttr('page'),
      position: { x: rect.x(), y: rect.y() },
      size: { width: rect.width(), height: rect.height() },
      attrs: rect.getAttrs()
    }))
  });
  
  // Debug coverRectsArray
  console.log('📦 coverRectsArray:', {
    length: coverRectsArray.length,
    items: coverRectsArray.map((item, idx) => ({
      index: idx,
      nodeId: item.node?.id(),
      node: item.node
    }))
  });
}

