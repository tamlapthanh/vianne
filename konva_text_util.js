// internal vars (kept private inside module)
let stage = null;
let backgroundLayer = null;
let iconLayer = null;
let drawingLayer = null;
let backgroundImage = null;

let RECT_TEXT_DEFAULT_COLOR = "blue";

// Thêm vào phần internal vars
let BASE_FONT_SIZE = 16; // Font size mặc định ở zoom 100%
let currentZoom = 1.0; // Tỷ lệ zoom hiện tại


// Thêm vào phần internal vars
let selectedTextNode = null;
let isMoveMode = false;



function createText(defaultText = TEXT_DEFAULT) {
  // groupText();
  if (!backgroundImage || !backgroundImage.image()) {
    console.warn("createText: backgroundImage not ready.");
    return;
  }

  if (!drawingLayer) {
    console.warn("createText: drawingLayer missing.");
    return;
  }

 // ✅ Giới hạn vùng random (để text không chạm mép)
  const minX = 0.05;
  const maxX = 0.85;
  const minY = 0.1;
  const maxY = 0.85;

  // ✅ Random vị trí trong vùng cho phép
  const xNorm = Math.random() * (maxX - minX) + minX;
  const yNorm = Math.random() * (maxY - minY) + minY;  

  // ✅ XỬ LÝ TOOLTIP: Tách text và tooltip từ defaultText
  let displayText = defaultText;
  let tooltipText = defaultText;
  
  // Nếu text có dạng "Text (Tooltip)" thì tách ra
  const tooltipMatch = defaultText.match(/^([^(]+)\s*\((.*)\)$/);
  if (tooltipMatch) {
    displayText = tooltipMatch[1].trim();
    tooltipText = defaultText; // Giữ nguyên toàn bộ text làm tooltip
  }

  const t =  {
    text: displayText, // ✅ Chỉ hiển thị phần trước dấu ()
    tooltip: tooltipText, // ✅ Lưu toàn bộ text làm tooltip
    // đặt mặc định ở góc phải dưới (relative to background)
    xNorm,
    yNorm,
    widthNorm: 0.3, // chiều rộng tương đối
    fontSize: 20,
    fontFamily: "Arial",
    fill: `hsl(${Math.random() * 360}, 80%, ${30 + Math.random() * 40}%)`,
    align: "center", // căn phải cho phù hợp với vị trí góc phải
    lineHeight: 1,
    attrs: {}, // có thể để trống
    baseFontSize: BASE_FONT_SIZE // ✅ Lưu font size gốc
  };

  // --- ASSIGN PAGE BASED ON CURRENT VIEW BEFORE COMPUTING ABSOLUTE COORDS ---
  try {
    // lấy thông tin background
    if (backgroundImage && backgroundImage.image) {
      // Use client rect so position calculations include transforms/scale
      let _bgRectCreate = null;
      try {
        _bgRectCreate = (backgroundImage && typeof backgroundImage.getClientRect === 'function')
          ? backgroundImage.getClientRect({ relativeTo: stage })
          : { x: backgroundImage.x(), y: backgroundImage.y(), width: backgroundImage.width(), height: backgroundImage.height() };
      } catch (err) {
        _bgRectCreate = { x: backgroundImage.x(), y: backgroundImage.y(), width: backgroundImage.width(), height: backgroundImage.height() };
      }

      const bgX = _bgRectCreate.x;
      const bgY = _bgRectCreate.y;
      const bgW = _bgRectCreate.width;
      const bgH = _bgRectCreate.height;

      // kiểm tra mode 2-page nếu helper isTwoPage có tồn tại
      const isDual = (typeof isTwoPage === "function") ? isTwoPage() : false;
      const pageDisplayWidth = isDual ? bgW / 2 : bgW;

      // Determine page and local normalized coords from pointer or stage center
      let assignedPage = 1;
      let xNormComputed = (typeof t.xNorm !== "undefined") ? Number(t.xNorm) : null;
      let yNormComputed = (typeof t.yNorm !== "undefined") ? Number(t.yNorm) : null;

      // prefer pointer position if available so created text appears where user expects
      try {
        const pointer = (stage && typeof stage.getPointerPosition === 'function') ? stage.getPointerPosition() : null;
        let refX = null, refY = null;
        if (pointer && pointer.x != null) {
          refX = pointer.x;
          refY = pointer.y;
        } else if (stage) {
          // fallback to stage center
          refX = stage.width() / 2;
          refY = stage.height() / 2;
        }

        if (refX != null) {
          assignedPage = (typeof getCurrentPageForPoint === 'function') ? getCurrentPageForPoint(refX, refY) : 1;
          // compute local page-normalized coords
          const pageStart = (assignedPage === 2 && isDual) ? pageDisplayWidth : 0;
          xNormComputed = pageDisplayWidth ? (refX - bgX - pageStart) / pageDisplayWidth : 0.5;
          yNormComputed = bgH ? (refY - bgY) / bgH : 0.5;
          // clamp
          xNormComputed = Math.max(0.01, Math.min(0.99, xNormComputed));
          yNormComputed = Math.max(0.01, Math.min(0.99, yNormComputed));
        }
      } catch (err) {
        // ignore and use random defaults below
      }

      // if not computed by pointer, fallback to existing or random
      if (xNormComputed === null) {
        xNormComputed = (typeof t.xNorm !== "undefined") ? Number(t.xNorm) : (Math.random() * (0.85 - 0.05) + 0.05);
      }
      if (yNormComputed === null) {
        yNormComputed = (typeof t.yNorm !== "undefined") ? Number(t.yNorm) : (Math.random() * (0.85 - 0.1) + 0.1);
      }

      // compute absolute coordinates based on assigned page and normalized coords
      const pageOffset = (assignedPage === 2 && isDual) ? pageDisplayWidth : 0;
      const absXcalc = bgX + pageOffset + xNormComputed * pageDisplayWidth;
      const absYcalc = bgY + yNormComputed * bgH;

      // gán page vào object text trước khi generate node
      t.page = assignedPage;
      t.xNorm = xNormComputed;
      t.yNorm = yNormComputed;

      // ✅ Lưu toạ độ full-background normalized để đảm bảo có thể restore
      // chính xác khi chuyển giữa single/dual page mode
      try {
        t.xNormFull = bgW ? formatNumber((absXcalc - bgX) / bgW) : formatNumber(xNormComputed);
        t.yNormFull = bgH ? formatNumber((absYcalc - bgY) / bgH) : formatNumber(yNormComputed);
      } catch (err) {
        // ignore
      }
      // optional debug
      // console.log('createText: assigned page', t.page, 'absX,absY=', absXcalc, absYcalc);
    } else {
      // fallback nếu background chưa sẵn sàng
      t.page = t.page || 1;
    }
  } catch (err) {
    console.warn("createText: error assigning page", err);
    t.page = t.page || 1;
  }
  generateTextNode(t, -1, backgroundImage, true, true, true, false);
  drawingLayer.batchDraw();
}

// thêm vào trong CanvasManager (canvas.js)
// loadTexts: restore texts but force no-rotation and open editor without rotating textarea
function loadTexts(textsArray, options = {}) {
  if (!Array.isArray(textsArray)) return;

  if (!backgroundImage || !backgroundImage.image()) {
    console.warn("loadTexts: backgroundImage not ready.");
    return;
  }

  if (!drawingLayer) {
    console.warn("loadTexts: drawingLayer missing.");
    return;
  }

  // Trong hàm loadTexts:
  const usedColors = new Set();

  textsArray.forEach((t, idx) => {
    IS_EANBLE_SWIPE = false;
    // ✅ Đảm bảo page attribute tồn tại (fallback = 1)
    if (!t.page) {
      t.page = 1;
    }    
    // ✅ Đảm bảo có baseFontSize khi load
    if (!t.baseFontSize) {
        t.baseFontSize = t.fontSize || BASE_FONT_SIZE;
    }
    // ✅ Đảm bảo có tooltip khi load (nếu không có thì dùng text)
    if (!t.tooltip && t.text) {
      t.tooltip = t.text;
    }
        
    t.fill = generateUniqueColor(idx, usedColors);    
    generateTextNode(t, idx, backgroundImage, true, true, false, true );
  });

  // redraw once  
  drawingLayer.batchDraw();

  // initMoveMode();
  // enableMoveMode();

    // Thay vì gọi trực tiếp, gọi hàm initialize
    initializeTextUtils();  
}

function generateTextNode(
  t,
  idx,
  backgroundImage,
  isDraggable,
  isShowText = true,
  isShowBorder = true,
  readOny = false
) {

  try {
    const htmlTooltip = document.getElementById("tooltip");

    // Use client rect to account for transforms/scale so absolute coords match
    let _bgRect = null;
    try {
      _bgRect = (backgroundImage && typeof backgroundImage.getClientRect === 'function')
        ? backgroundImage.getClientRect({ relativeTo: stage })
        : { x: backgroundImage.x(), y: backgroundImage.y(), width: backgroundImage.width(), height: backgroundImage.height() };
    } catch (err) {
      _bgRect = { x: backgroundImage.x(), y: backgroundImage.y(), width: backgroundImage.width(), height: backgroundImage.height() };
    }

    const bgX = _bgRect.x;
    const bgY = _bgRect.y;
    const bgW = _bgRect.width;
    const bgH = _bgRect.height;

    // ✅ Xác định mode và page width
    const isDualPage = isTwoPage();
    const pageDisplayWidth = isDualPage ? bgW / 2 : bgW;

    // ✅ Xác định page của text này
    const textPage = t.page || 1;

    let x, y, w;

    // If saved entry contains absolute position (absX), use it for accurate restore
    // across canvas size changes (e.g., zoom, mode switches, window resize)
    if (typeof t.absX !== 'undefined' && isDualPage) {
      try {
        const savedAbsX = Number(t.absX) || 0;
        const savedAbsY = Number(t.absY) || 0;
        
        // Determine which page this position belongs to in current dual-page mode
        // Page 1: bgX to bgX + pageDisplayWidth
        // Page 2: bgX + pageDisplayWidth to bgX + 2*pageDisplayWidth
        const relativeX = savedAbsX - bgX;
        const computedPage = relativeX >= pageDisplayWidth ? 2 : 1;
        
        // Convert absolute position to page-local normalized coords
        const pageStartX = computedPage === 1 ? 0 : pageDisplayWidth;
        const localX = relativeX - pageStartX;
        
        t.xNorm = Math.max(0, Math.min(1, localX / pageDisplayWidth));
        t.yNorm = Math.max(0, Math.min(1, (savedAbsY - bgY) / bgH));
        t.page = computedPage;
      } catch (err) {
        // Fallback: use xNormFull if absX not available
        if (typeof t.xNormFull !== 'undefined') {
          const fullNorm = Number(t.xNormFull) || 0;
          const computedPage = fullNorm >= 0.5 ? 2 : 1;
          const pageStartX = computedPage === 1 ? 0 : pageDisplayWidth;
          const localX = fullNorm * bgW - pageStartX;
          const localNorm = pageDisplayWidth ? localX / pageDisplayWidth : 0;
          t.xNorm = Math.max(0, Math.min(1, localNorm));
          t.yNorm = Math.max(0, Math.min(1, Number(t.yNormFull) || 0));
          t.page = computedPage;
        }
      }
    }

    // If restoring in SINGLE-PAGE view, compute xNorm based on absolute position
    // This handles canvas size changes (e.g., zoom, mode switch) correctly
    if (!isDualPage && typeof t.absX !== 'undefined') {
      try {
        // Use absolute position stored from save time
        // Convert absolute pixels to normalized coords based on CURRENT background
        const savedAbsX = Number(t.absX) || 0;
        const savedAbsY = Number(t.absY) || 0;
        
        // xNorm = (absX - bgX) / bgW  =>  absX = bgX + xNorm * bgW
        // So: xNorm = (savedAbsX - bgX) / bgW
        t.xNorm = Math.max(0, Math.min(1, (savedAbsX - bgX) / bgW));
        t.yNorm = Math.max(0, Math.min(1, (savedAbsY - bgY) / bgH));
        t.page = 1;
        
        // ✅ DEBUG: Log restore in single-page mode
        console.log('📝 Single-page restore (absX method):', {
          text: t.text.substring(0, 20),
          savedAbsX: savedAbsX,
          savedAbsY: savedAbsY,
          bgX: bgX,
          bgY: bgY,
          bgW: bgW,
          bgH: bgH,
          computedXNorm: (savedAbsX - bgX) / bgW,
          computedYNorm: (savedAbsY - bgY) / bgH,
          t_xNorm: t.xNorm,
          t_yNorm: t.yNorm,
          savedInDualPage: t.savedInDualPage
        });
      } catch (err) {
        // Fallback: use xNormFull if absX/absY not available
        if (typeof t.xNormFull !== 'undefined') {
          t.xNorm = Math.max(0, Math.min(1, Number(t.xNormFull) || 0));
          t.yNorm = Math.max(0, Math.min(1, Number(t.yNormFull) || 0));
          console.log('📝 Single-page restore (xNormFull fallback):', {
            text: t.text.substring(0, 20),
            xNormFull: t.xNormFull,
            yNormFull: t.yNormFull,
            t_xNorm: t.xNorm,
            t_yNorm: t.yNorm
          });
        }
      }
    }

    if (isDualPage) {
      // ✅ DESKTOP MODE: Restore theo page width
      const pageStartX = (textPage === 1) ? 0 : pageDisplayWidth;
      x = bgX + pageStartX + (t.xNorm || 0) * pageDisplayWidth;
      y = bgY + (t.yNorm || 0) * bgH;
      w = (Number(t.widthNorm) || 0) * pageDisplayWidth;
    } else {
      // ✅ MOBILE MODE: Restore theo toàn bộ width
      x = bgX + (t.xNorm || 0) * bgW;
      y = bgY + (t.yNorm || 0) * bgH;
      w = (Number(t.widthNorm) || 0) * bgW;
    }
    
    const baseFontSize = t.baseFontSize || BASE_FONT_SIZE;
    const fontSize = Math.max(8, baseFontSize * currentZoom); // ✅ Tính theo zoom

    // if (isMobile()) {
    //   y -= 2;
    //   t.fontSize = BASE_FONT_SIZE;
    // }
    

    // padding/corner cho background
    const PADDING = t.padding ?? 8;
    const CORNER_RADIUS = t.cornerRadius ?? 6;



    // --- TẠO TEXT --- (giữ nguyên vị trí theo code cũ)
    const textNode = new Konva.Text({
      x: Math.round(x),
      y: Math.round(y),
      text: typeof t.text === "string" ? t.text : "",
      fontSize: fontSize, // ✅ Dùng fontSize đã tính toán
      fontFamily: t.fontFamily || "Arial",
      fontStyle: 'bold',
      fontWeight: 'bold', // ✅ CẢ HAI ĐỀU ĐƯỢC      
      fill: t.fill || "blue",
      width: Math.max(10, Math.round(w || fontSize * 4)),
      draggable: true,
      rotation: 0,
      align: t.align || "center",
      lineHeight: t.lineHeight || 1,
      id: t.id || undefined,
      listening: true,
      page: textPage  // ✅ THÊM DÒNG NÀY
    });

    // ✅ THÊM: Gán PADDING vào textNode để sử dụng ở nơi khác
    textNode._padding = PADDING;        

    // ✅ Lưu baseFontSize để có thể tính lại khi zoom
    textNode.setAttr('baseFontSize', baseFontSize);    

    // ✅ Lưu tooltip vào textNode
    textNode.setAttr('tooltip', t.tooltip || t.text);

    // Restore attributes và flags lên textNode (giữ logic của bạn)
    textNode.fill(t.fill);
    textNode.setAttr("isShowText", isShowText);
    textNode.setAttr("isShowBorder", isShowBorder);
    textNode.setAttr("readOny", readOny);

    // Restore safe attrs (giữ logic của bạn)
    if (t.attrs && typeof t.attrs === "object") {
      const safeAttrs = Object.assign({}, t.attrs);
      delete safeAttrs.text;
      delete safeAttrs.x;
      delete safeAttrs.y;
      delete safeAttrs.width;
      delete safeAttrs.height;
      delete safeAttrs.id;
      delete safeAttrs.rotation;
      delete safeAttrs.fontSize; // prevent override
      textNode.setAttrs(safeAttrs);
    }

    // --- TẠO NỀN (background rect) ---
    const bgRect = new Konva.Rect({
      x: textNode.x() - PADDING,
      y: textNode.y() - PADDING,
      width: textNode.width() + PADDING * 2,
      height: textNode.height() + PADDING * 2,
      fill:
        typeof t.backgroundColor !== "undefined"
          ? t.backgroundColor
          : "transparent",
      cornerRadius: CORNER_RADIUS,
      stroke: t.backgroundColor ? "#ddd" : "transparent",
      strokeWidth: 1,
      shadowColor: "black",
      shadowBlur: 4,
      draggable: true,
      shadowOffset: { x: 1, y: 1 },
      shadowOpacity: 0.12,
      listening: true,
    });

    // --- HÀM CẬP NHẬT NỀN --- (giữ đồng bộ khi text thay đổi/kéo/transform)
    function updateBackground() {
      // cập nhật kích thước từ textNode
      const textW = textNode.width();
      const textH = textNode.height();
      // nếu textNode có padding internal, bạn có thể cộng thêm, mình dùng PADDING chung
      bgRect.width(textW + PADDING * 2);
      bgRect.height(textH + PADDING * 2);
      // đặt vị trí bgRect dựa vào textNode
      bgRect.x(textNode.x() - PADDING);
      bgRect.y(textNode.y() - PADDING);

      // ✅ THÊM: Đồng bộ page attribute
      bgRect.setAttr('page', textNode.getAttr('page'));      
    }
    updateBackground();

    // ✅ THÊM: Gán hàm updateBackground vào textNode để có thể gọi từ bên ngoài
    textNode._updateBackground = updateBackground;

    // ✅ Lưu reference để dễ quản lý
    textNode._bgRect = bgRect;    

    // --- Add to layer: bgRect trước, textNode sau để text hiển thị trên nền ---
    drawingLayer.add(bgRect);
    drawingLayer.add(textNode);

    // ✅ THÊM: Đồng bộ khi kéo bgRect
    bgRect.on("dragmove", () => {
      // Khi kéo bgRect → cập nhật vị trí textNode
      textNode.x(bgRect.x() + PADDING);
      textNode.y(bgRect.y() + PADDING);
      updateBackground();
    });

    bgRect.on("dragend", () => {
      // ✅ Cập nhật page cho cả bgRect và textNode
      // use absolute position to determine page reliably
      const absPos = bgRect.getAbsolutePosition();
      const newX = absPos.x + PADDING; // position of text within bgRect
      const newY = absPos.y + PADDING;

      if (isTwoPage()) {
        const newPage = typeof getCurrentPageForPoint === 'function' ? getCurrentPageForPoint(newX, newY) : textNode.getAttr('page');
        const oldPage = textNode.getAttr('page');

        if (newPage !== oldPage) {
          console.log(`📝 Text (via bgRect) moved: page ${oldPage} → ${newPage}`);
          textNode.setAttr('page', newPage);
          bgRect.setAttr('page', newPage);
        }
      }
    });    

    
      // --- AUTO-FIT WIDTH SAU KHI TẠO ---
  // đặt ở ngay sau `drawingLayer.add(textNode);`
  (function autoFitWidthAfterCreate() {
    try {

      // const isReadOnly = textNode.getAttr("readOny");
      // if (isReadOnly) {
      //   return ;
      // }

      const currentText = textNode.text().trim();
      if (!currentText || currentText === TEXT_DEFAULT) return; // ❌ bỏ qua text mặc định
      const lines = (textNode.text() || "").split("\n");
      const ctx = document.createElement("canvas").getContext("2d");
      // đảm bảo font giống Konva text
      const fs = textNode.fontSize ? textNode.fontSize() : fontSize;
      const ff = textNode.fontFamily ? textNode.fontFamily() : (t.fontFamily || "Arial");
      ctx.font = (fs || 14) + "px " + (ff || "Arial");

      const maxWidth = lines.length
        ? Math.max(...lines.map(line => ctx.measureText(line).width))
        : ctx.measureText(textNode.text() || "").width;

      const paddingCalc = 10; // cùng giá trị bạn dùng trong editor
      // nếu muốn giới hạn width tối đa (ví dụ không vượt quá một phần của background), bạn có thể clamp:
      const bgRect = backgroundImage && backgroundImage.getClientRect ? backgroundImage.getClientRect({ relativeTo: stage }) : null;
      const maxAllowed = bgRect ? Math.floor(bgRect.width * 0.9) : Infinity; // 90% background width
      const newWidth = Math.min(Math.ceil(maxWidth + paddingCalc), maxAllowed);

      textNode.width(Math.max(10, newWidth));

      // cập nhật nền + transformer
      try { updateBackground(); } catch (e) {}
      try { if (textNode._transformer) textNode._transformer.forceUpdate(); } catch (e) {}
      drawingLayer.batchDraw();
    } catch (err) {
      // không block nếu lỗi
      console.warn('autoFitWidthAfterCreate failed', err);
    }
  })();


    // Restore attributes và flags lên textNode (giữ logic của bạn)
    textNode.fill(t.fill);
    textNode.setAttr("isShowText", isShowText);
    textNode.setAttr("isShowBorder", isShowBorder);
    textNode.setAttr("readOny", readOny);

    // --- Transformer (no rotation) ---
    const tr = new Konva.Transformer({
      node: textNode,
      enabledAnchors: [
        "middle-left",
        "middle-right",
        "rotater",
        "top-center",
        "bottom-center",
      ],
      rotateEnabled: true,
      boundBoxFunc: function (oldBox, newBox) {
        newBox.width = Math.max(30, newBox.width);
        newBox.height = Math.max(30, newBox.height);
        newBox.rotation = 0;
        return newBox;
      },
      anchorFill: "#fff",
      anchorStroke: "#444",
      anchorSize: 6,
      draggable: true,
      borderStrokeWidth: 0.3,
      borderStroke: "rgba(0, 0, 0, 0.2)",
    });

    drawingLayer.add(tr);

    // 🔗 Gán reference ngược để dễ xóa
    textNode._transformer = tr;

    textNode.on("transform", function () {
      // scaleY ảnh hưởng lineHeight
      const scaleY = textNode.scaleY() || 1;
      const newLineHeight = (textNode.lineHeight() || 1) * scaleY;
      textNode.lineHeight(newLineHeight);
      textNode.scaleY(1);

      // width / scaleX
      const scaleX = textNode.scaleX() || 1;
      textNode.width(textNode.width() * scaleX);
      textNode.scaleX(1);

      // cập nhật nền
      updateBackground();
      drawingLayer.batchDraw();
    });


    // Drag events (sync updated background khi kéo)

    textNode.on("dragstart", () => {
      setCursor("pointer");
      // ✅ Lưu page ban đầu để debug
      textNode.setAttr('_dragStartPage', textNode.getAttr('page'));
    });

    textNode.on("dragmove", () => {
      setCursor("pointer");
    });

    textNode.on("dragend", () => {
      setCursor("default");
      
      // ✅ Cập nhật page dựa trên vị trí mới
      const absPos = textNode.getAbsolutePosition();
      const newX = absPos.x;
      const newY = absPos.y;
      
      // Chỉ cập nhật page trong Desktop mode (dual pages)
      if (isTwoPage()) {
        const newPage = typeof getCurrentPageForPoint === 'function' ? getCurrentPageForPoint(newX, newY) : textNode.getAttr('page');
        const oldPage = textNode.getAttr('page');
        
        if (newPage !== oldPage) {
          console.log(`📝 Text moved: page ${oldPage} → ${newPage}`);
          textNode.setAttr('page', newPage);
          
          // ✅ Cập nhật màu fill để debug (optional)
          // if (newPage === 1) {
          //   textNode.fill('blue');
          // } else {
          //   textNode.fill('red');
          // }
        }
      }
      // Mobile mode: page không thay đổi (luôn là JSON page hiện tại)
    });

    // --- TOOLTIP (an toàn check htmlTooltip/stage) ---
    textNode.on("mousemove", (e) => {
      try {
        const stageLocal = e.target.getStage();
        const pointer = stageLocal && stageLocal.getPointerPosition();
        if (pointer && htmlTooltip) {
          htmlTooltip.style.left = pointer.x + 10 + "px";
          htmlTooltip.style.top = pointer.y + 10 + "px";
          // ✅ SỬA: Hiển thị tooltip từ thuộc tính tooltip thay vì text
          const tooltipContent = textNode.getAttr('tooltip') || textNode.text();
          htmlTooltip.textContent = tooltipContent;
          htmlTooltip.style.display = "block";
          htmlTooltip.style.opacity = "1";
        }
      } catch (err) {}
    });

    textNode.on("mouseout", () => {
      if (htmlTooltip) {
        htmlTooltip.style.opacity = "0";
        setTimeout(() => (htmlTooltip.style.display = "none"), 150);
      }
    });

    // show/hide helpers (cập nhật bgRect luôn)
    function showBorder(isShow = true) {
      tr.visible(Boolean(isShow));
      try {
        tr.forceUpdate();
      } catch (e) {}
      drawingLayer.batchDraw();
    }

    function showText(isShow = true) {
      isShow = true;
      textNode.visible(Boolean(isShow));
      bgRect.visible(Boolean(isShow)); // bg cùng ẩn/hiện với text
      drawingLayer.batchDraw();
    }

    // enable draggable
    // textNode.draggable(Boolean(isDraggable));
    // tr.draggable(Boolean(isDraggable));

    // đảm bảo transformer hiển thị theo isShowBorder
    showText(isShowText);
    showBorder(isShowBorder);

    // --- Rotate icon mở color popup (an toàn) ---
    tr.on("mousedown touchstart", function (evt) {
      const target = evt.target;
      const isRotater =
        (typeof target.name === "function" && target.name() === "rotater") ||
        (typeof target.hasName === "function" && target.hasName("rotater"));
      if (isRotater) {
        evt.cancelBubble = true;
        evt.evt?.preventDefault?.();
        showColorisPopup(textNode);
      }
    });

    // cursor feedback
    const setCursor = (type) => {
      if (stage && stage.container()) stage.container().style.cursor = type;
    };
    tr.on("mouseover", () => setCursor("pointer"));
    tr.on("mouseout", () => setCursor("default"));
    textNode.on("mouseover", () => setCursor("pointer"));
    textNode.on("mouseout", () => setCursor("default"));

    // update background khi text thay đổi
    textNode.on("text change fontSize", () => {
      updateBackground();
      try {
        tr.forceUpdate();
      } catch (e) {}
      drawingLayer.batchDraw();
    });

    // --- Editor logic (open textarea) ---
    function openTextEditor(e) {
      if (readOny) {
        return;
      }

      textNode.hide();
      tr.hide();
      bgRect.hide();

      const absPos = textNode.absolutePosition();
      const transform = stage.getAbsoluteTransform().copy();
      const clientPoint = transform.point({ x: absPos.x, y: absPos.y });
      const rect = stage.container().getBoundingClientRect();
      const areaX = rect.left + clientPoint.x;
      const areaY = rect.top + clientPoint.y;

      const textarea = document.createElement("textarea");
      document.body.appendChild(textarea);
      // ✅ SỬA: Hiển thị tooltip (toàn bộ text) trong editor thay vì chỉ display text
      const tooltipContent = textNode.getAttr('tooltip') || textNode.text();
      textarea.value = tooltipContent;
      textarea.style.position = "absolute";
      textarea.style.top = areaY + "px";
      textarea.style.left = areaX + "px";

      const absScaleX = textNode.getAbsoluteScale()?.x || 1;
      const absScaleY = textNode.getAbsoluteScale()?.y || 1;
      const padding = 0;
      textarea.style.width =
        Math.max(20, (textNode.width() - padding * 2) * absScaleX) + "px";
      textarea.style.height =
        Math.max(
          24,
          textNode.fontSize() * (textNode.lineHeight() || 1) * absScaleY
        ) + "px";

      textarea.style.fontSize = textNode.fontSize() * absScaleX + "px";
      textarea.style.border = "none";
      textarea.style.background = "transparent";
      textarea.style.outline = "none";
      textarea.style.resize = "none";
      textarea.style.fontFamily = textNode.fontFamily();
      textarea.style.textAlign = textNode.align();
      textarea.style.color = textNode.fill();

      textarea.focus();
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + 3 + "px";

      function removeTextarea() {
        textarea.remove();
        window.removeEventListener("click", handleOutsideClick);
        window.removeEventListener("touchstart", handleOutsideClick);
        textNode.show();
        tr.show();
        bgRect.show();
        try {
          tr.forceUpdate();
        } catch (e) {}
        drawingLayer.batchDraw();
      }

      function handleOutsideClick(ev) {
        if (ev.target !== textarea) {
          // ✅ SỬA: Xử lý text và tooltip khi kết thúc edit
          const editedText = textarea.value;
          
          // Tách display text và tooltip từ edited text
          const tooltipMatch = editedText.match(/^([^(]+)\s*\((.*)\)$/);
          if (tooltipMatch) {
            // Có dạng "Text (Tooltip)" - tách ra
            textNode.text(tooltipMatch[1].trim());
            textNode.setAttr('tooltip', editedText);
          } else {
            // Không có tooltip - dùng toàn bộ làm cả display và tooltip
            textNode.text(editedText);
            textNode.setAttr('tooltip', editedText);
          }

          // đo lại width cho textNode dựa vào nội dung
          const lines = textNode.text().split("\n");
          const ctx = document.createElement("canvas").getContext("2d");
          ctx.font = textNode.fontSize() + "px " + textNode.fontFamily();
          const maxWidth = Math.max(
            ...lines.map((line) => ctx.measureText(line).width)
          );
          const paddingCalc = 10;
          textNode.width(maxWidth + paddingCalc);

          updateBackground();
          removeTextarea();
        }
      }
      setTimeout(() => {
        window.addEventListener("click", handleOutsideClick);
        window.addEventListener("touchstart", handleOutsideClick);
      }, 0);

      textarea.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
          ev.preventDefault();
          // ✅ SỬA: Xử lý text và tooltip khi nhấn Enter
          const editedText = textarea.value;
          
          // Tách display text và tooltip từ edited text
          const tooltipMatch = editedText.match(/^([^(]+)\s*\((.*)\)$/);
          if (tooltipMatch) {
            // Có dạng "Text (Tooltip)" - tách ra
            textNode.text(tooltipMatch[1].trim());
            textNode.setAttr('tooltip', editedText);
          } else {
            // Không có tooltip - dùng toàn bộ làm cả display và tooltip
            textNode.text(editedText);
            textNode.setAttr('tooltip', editedText);
          }

          const lines = textNode.text().split("\n");
          const ctx = document.createElement("canvas").getContext("2d");
          ctx.font = textNode.fontSize() + "px " + textNode.fontFamily();
          const maxWidth = Math.max(
            ...lines.map((line) => ctx.measureText(line).width)
          );
          const paddingCalc = 10;
          textNode.width(maxWidth + paddingCalc);
          updateBackground();
          removeTextarea();
        } else if (ev.key === "Escape") {
          removeTextarea();
        }
      });

      textarea.addEventListener("input", function () {
        const scale = textNode.getAbsoluteScale()?.x || 1;
        textarea.style.width = textNode.width() * scale + "px";
        textarea.style.height = "auto";
        textarea.style.height =
          textarea.scrollHeight + textNode.fontSize() + "px";
      });
    }

(function attachMouseClickDbl(node, opts = {}) {
  // ✅ TRONG MOVE MODE: KHÔNG gắn sự kiện gì cả
  if (isMoveMode) {
    return;
  }

  const dblTimeout = opts.dblTimeout || 350;
  const moveThreshold = opts.moveThreshold || 6;
  let lastClickTime = 0;
  let downPos = null;

  node.on("mousedown", (ev) => {
    const evt = ev.evt;
    downPos = evt ? { x: evt.clientX, y: evt.clientY } : null;
  });

  node.on("mouseup", (ev) => {
    const evt = ev.evt;
    const now = Date.now();
    let moved = false;
    if (downPos && evt) {
      const dx = Math.abs(evt.clientX - downPos.x);
      const dy = Math.abs(evt.clientY - downPos.y);
      moved = Math.hypot(dx, dy) > moveThreshold;
    }
    downPos = null;
    if (moved) return;

    if (now - lastClickTime <= dblTimeout) {
      lastClickTime = 0;
      openTextEditor(ev);
    } else {
      lastClickTime = now;
      setTimeout(() => {
        lastClickTime = 0;
      }, dblTimeout + 5);
    }
  });
})(textNode);


textNode.on("touchstart", (ev) => {
  if (isMoveMode) {
    // ✅ TRONG MOVE MODE: KHÔNG làm gì cả
    return;
  }
});


    (function addDesktopDblHandler(node) {
      const container = stage.container();
      function onContainerDblClick(ev) {
        const rect = container.getBoundingClientRect();
        const stagePt = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
        const hit = stage.getIntersection(stagePt);
        if (hit === node) openTextEditor({ target: node });
      }
      container.addEventListener("dblclick", onContainerDblClick, true);
      node._containerDbl = onContainerDblClick;
    })(textNode);

    textNode.on("dbltap dblclick", (e) => openTextEditor(e));

    textNode.on("click", (e) => {
    // ✅ THÊM DÒNG NÀY - hỗ trợ move mode
        // if (isMoveMode && !selectedTextNode) {
        //     handleStageClick(e);
        //     e.cancelBubble = true; // ngừng lan ra stage click
        // }

          /* optional debug */
        });


      } catch (err) {
        console.warn("generateTextNode: failed to restore", idx, err, t);
      }
}



function saveTextNodes(bgDisplay, isPage1 = true, isDualPage = false, pageDisplayWidth = null) {
  var textNodes = [];
  try {
    const texts = drawingLayer ? drawingLayer.find("Text") : [];

    // compute background client rect to normalize using absolute coords (handles scale)
    let bgClient = null;
    try {
      bgClient = (backgroundImage && typeof backgroundImage.getClientRect === 'function') ? backgroundImage.getClientRect({ relativeTo: stage }) : bgDisplay;
    } catch (err) {
      bgClient = bgDisplay;
    }

    texts.forEach((tn) => {
      // use absolute position to be robust against group/transform
      const absPos = (tn.getAbsolutePosition && typeof tn.getAbsolutePosition === 'function') ? tn.getAbsolutePosition() : { x: tn.x(), y: tn.y() };
      const absX = absPos.x;
      const absY = absPos.y;
      const w = tn.width();
      const h = tn.height();

      let nx, ny, nw, nh;

      if (isDualPage) {
        // ✅ DESKTOP MODE: Normalize theo PAGE width using client rect
        const relativeX = absX - bgClient.x;
        const actualPageDisplayWidth = bgClient.width / 2;
        const pageStartX = isPage1 ? 0 : actualPageDisplayWidth;

        // Normalize x theo page width
        nx = actualPageDisplayWidth ? (relativeX - pageStartX) / actualPageDisplayWidth : 0;
        ny = bgClient.height ? (absY - bgClient.y) / bgClient.height : 0;

        // Width/height cũng normalize theo page width
        nw = actualPageDisplayWidth ? w / actualPageDisplayWidth : 0;
        nh = bgClient.height ? h / bgClient.height : 0;
      } else {
        // ✅ MOBILE MODE: Normalize theo toàn bộ background width (use client rect)
        nx = bgClient.width ? (absX - bgClient.x) / bgClient.width : 0;
        ny = bgClient.height ? (absY - bgClient.y) / bgClient.height : 0;
        nw = bgClient.width ? w / bgClient.width : 0;
        nh = bgClient.height ? h / bgClient.height : 0;
      }

      // Lấy attrs nhưng lọc ra các trường đã lưu riêng (tránh duplicate)
      let savedAttrs = {};
      try {
        const allAttrs = tn.getAttrs ? tn.getAttrs() : {};
        // copy selective attrs (or remove keys you don't want)
        savedAttrs = Object.assign({}, allAttrs);
        // remove duplicates / positional / dimensional props
        delete savedAttrs.text;
        delete savedAttrs.x;
        delete savedAttrs.y;
        delete savedAttrs.width;
        delete savedAttrs.height;
        delete savedAttrs.id; // nếu bạn không muốn ghi id vào attrs nữa
        delete savedAttrs.isShowText;
        delete savedAttrs.isShowBorder;
        delete savedAttrs.readOny;
      } catch (err) {
        savedAttrs = null;
      }

      // compute full-normalized X/Y values before building object
      // In single-page mode: xNormFull = xNorm (since the page IS the full background)
      // In dual-page mode: xNormFull = normalized over the full merged background width
      let xNormFull, yNormFull;
      
      if (isDualPage) {
        // Dual-page save: xNormFull is over the merged background width (full 0..1)
        // Compute relative position from the absolute position
        xNormFull = formatNumber(bgClient.width ? (absX - bgClient.x) / bgClient.width : nx);
        yNormFull = formatNumber(bgClient.height ? (absY - bgClient.y) / bgClient.height : ny);
      } else {
        // Single-page save: xNormFull = xNorm (page width = full background width in single mode)
        // This allows proper restoration when switching to dual-page mode
        xNormFull = formatNumber(nx);
        yNormFull = formatNumber(ny);
      }

      textNodes.push({
        text: tn.text(),
        tooltip: tn.getAttr('tooltip') || tn.text(), // ✅ Lưu tooltip
        fontSize: tn.getAttr('baseFontSize') || BASE_FONT_SIZE, // ✅ Lưu font size gốc
        baseFontSize: tn.getAttr('baseFontSize') || BASE_FONT_SIZE, // ✅ Thêm baseFontSize
        fontFamily: tn.fontFamily ? tn.fontFamily() : undefined,
        fill: tn.fill ? tn.fill() : undefined,
        align: tn.align ? tn.align() : undefined,
        lineHeight: tn.lineHeight ? tn.lineHeight() : undefined,
        widthNorm: formatNumber(nw),
        heightNorm: formatNumber(nh),
        xNorm: formatNumber(nx),
        yNorm: formatNumber(ny),
        xNormFull: xNormFull,
        yNormFull: yNormFull,
        absX: formatNumber(absX),      // ✅ STORE ABSOLUTE PIXEL POSITION (canvas-size-independent)
        absY: formatNumber(absY),      // ✅ STORE ABSOLUTE PIXEL POSITION (canvas-size-independent)
        draggable: !!tn.draggable(),
        id: tn.id() || null,
        attrs: savedAttrs,
        page: tn.getAttr('page') || 1,  // ✅ THÊM DÒNG NÀY
        savedInDualPage: isDualPage  // ✅ EXPLICITLY STORE THE SAVE MODE for reliable detection on restore
      });
    });
  } catch (err) {
    console.warn("saveTextNodes: error enumerating Text nodes", err);
  }

  return textNodes;
}

function deleteTextNode(textNode) {
  if (!textNode) return;

  try {
    // 🔥 chỉ xóa transformer gắn với textNode này
    if (textNode._transformer) {
      textNode._transformer.destroy();
    }

    // 🔥 gỡ event listener dblclick nếu có
    if (textNode._containerDbl && stage && stage.container) {
      stage.container().removeEventListener("dblclick", textNode._containerDbl, true);
    }

    // 🔥 xóa luôn background rect nếu có (nếu bạn lưu reference)
    if (textNode._bgRect) {
      textNode._bgRect.destroy();
    }

    textNode.destroy();
    drawingLayer.batchDraw();
  } catch (err) {
    console.warn("deleteTextNode failed", err);
  }
}


function updateFontSizeForZoom(zoomLevel) {
    currentZoom = zoomLevel;
    const textNodes = drawingLayer ? drawingLayer.find("Text") : [];
    
    textNodes.forEach(textNode => {
        const baseSize = textNode.getAttr('baseFontSize') || BASE_FONT_SIZE;
        const newSize = Math.max(8, baseSize * zoomLevel);
        
        textNode.fontSize(newSize);
        
        // ✅ AUTO-FIT WIDTH ĐỘNG theo nội dung thực tế
        autoFitTextWidth(textNode);
        
        // Cập nhật background
        updateTextBackground(textNode);
    });
    
    if (drawingLayer) {
        drawingLayer.batchDraw();
    }
}

function autoFitTextWidth(textNode) {
    try {
        const currentText = textNode.text().trim();
        if (!currentText) return;
        
        // ✅ PHƯƠNG PHÁP 1: Reset width để text tự co giãn
        textNode.width(null);
        
        // ✅ PHƯƠNG PHÁP 2: Dùng Konva's measurement
        let textWidth;
        try {
            textWidth = textNode.getTextWidth();
        } catch (e) {
            // Fallback: tính thủ công
            const ctx = document.createElement("canvas").getContext("2d");
            const fs = textNode.fontSize();
            const ff = textNode.fontFamily() || "Arial";
            ctx.font = `${fs}px ${ff}`;
            
            const lines = currentText.split("\n");
            textWidth = lines.length 
                ? Math.max(...lines.map(line => ctx.measureText(line).width))
                : ctx.measureText(currentText).width;
        }
        
        // ✅ SET WIDTH MỚI VỚI PADDING
        const paddingCalc = 12 * currentZoom; // Tăng padding một chút
        const newWidth = Math.max(40, Math.ceil(textWidth + paddingCalc));
        
        textNode.width(newWidth);
        
        console.log('✅ Auto-fit successful:', {
            text: currentText.substring(0, 30) + '...',
            textWidth: Math.round(textWidth),
            newWidth,
            zoom: currentZoom
        });
        
    } catch (err) {
        console.warn('autoFitTextWidth failed', err);
    }
}


// ✅ Hàm cập nhật background cho text
function updateTextBackground(textNode) {
    if (!textNode._bgRect) return;
    
    const PADDING = 8 * currentZoom; // ✅ Padding scale theo zoom
    
    textNode._bgRect.x(textNode.x() - PADDING);
    textNode._bgRect.y(textNode.y() - PADDING);
    textNode._bgRect.width(textNode.width() + PADDING * 2);
    textNode._bgRect.height(textNode.height() + PADDING * 2);
    
    // ✅ GIỮ NGUYÊN stroke settings khi cập nhật
    // Không reset stroke ở đây
    
    // Cập nhật transformer nếu có
    if (textNode._transformer) {
        try {
            textNode._transformer.forceUpdate();
        } catch (e) {}
    }
}



// Thêm hàm để kích hoạt chế độ di chuyển
function enableMoveMode() {
    isMoveMode = true;
    if (stage && stage.container()) {
        stage.container().style.cursor = "crosshair";
    }
    console.log("🔄 Move mode enabled - Stage cursor:", stage?.container()?.style.cursor);
}

// Thêm hàm để tắt chế độ di chuyển
function disableMoveMode() {
    isMoveMode = false;
    selectedTextNode = null;
    if (stage && stage.container()) {
        stage.container().style.cursor = "default";
    }
    console.log("❌ Move mode disabled");
}

// Hàm debug để kiểm tra vị trí
function debugTextPosition(textNode) {
    if (!textNode) return;
    
    console.log('🔍 DEBUG Text Position:', {
        text: textNode.text().substring(0, 20),
        textX: textNode.x(),
        textY: textNode.y(),
        textWidth: textNode.width(),
        textHeight: textNode.height(),
        bgRectX: textNode._bgRect ? textNode._bgRect.x() : 'N/A',
        bgRectY: textNode._bgRect ? textNode._bgRect.y() : 'N/A',
        bgRectWidth: textNode._bgRect ? textNode._bgRect.width() : 'N/A',
        bgRectHeight: textNode._bgRect ? textNode._bgRect.height() : 'N/A',
        hasUpdateBackground: !!textNode._updateBackground
    });
}

// Hàm xử lý sự kiện click trên stage
function handleStageClick(ev) {
    console.log("🎯 Stage click/tap event triggered", ev.type);
    
    if (!isMoveMode) {
        console.log("❌ Move mode not active");
        return;
    }
    
    if (!stage) {
        console.log("❌ Stage not available");
        return;
    }
    
    // Lấy vị trí click từ event
    let pos;
    if (ev.evt) {
        // Konva event
        pos = stage.getPointerPosition();
    } else {
        // Native event
        const rect = stage.container().getBoundingClientRect();
        pos = {
            x: ev.clientX - rect.left,
            y: ev.clientY - rect.top
        };
    }
    
    if (!pos) {
        console.log("❌ No pointer position");
        return;
    }
    
    console.log("🎯 Click position:", pos.x, pos.y);
    
    // TÌM TEXT NODE tại vị trí click
    const allTexts = drawingLayer.find('Text');
    let clickedTextNode = null;
    
    // Kiểm tra từng text node xem có bị click không
    for (let textNode of allTexts) {
        const rect = textNode.getClientRect();
        if (pos.x >= rect.x && pos.x <= rect.x + rect.width &&
            pos.y >= rect.y && pos.y <= rect.y + rect.height) {
            clickedTextNode = textNode;
            console.log("🎯 Found text node at click position:", textNode.text());
            break;
        }
    }
    
    if (clickedTextNode) {
        // Click vào text node: CHỌN hoặc DI CHUYỂN text
        if (selectedTextNode !== clickedTextNode) {
            // Chọn text node mới
            selectTextNode(clickedTextNode);
        } else {
            // ✅ SỬA: Click vào text node ĐÃ CHỌN - DI CHUYỂN nó đến vị trí click
            console.log("🎯 Moving selected text to new click position");
            moveSelectedTextToPosition(pos.x, pos.y);
        }
    } else {
        // Click vào vùng trống: DI CHUYỂN text đã chọn
        if (selectedTextNode) {
            console.log("🎯 Moving selected text to new position");
            moveSelectedTextToPosition(pos.x, pos.y);
        } else {
            console.log("⚠️ No text selected, please click a text first");
        }
    }
}


// Hàm chọn text node
function selectTextNode(textNode) {
    // Bỏ chọn text node cũ (nếu có)
    if (selectedTextNode && selectedTextNode !== textNode) {
        if (selectedTextNode._bgRect) {
            selectedTextNode._bgRect.stroke('transparent');
            selectedTextNode._bgRect.strokeWidth(1);
        }
    }
    
    selectedTextNode = textNode;
    
    // Highlight text được chọn
    if (selectedTextNode._bgRect) {
        selectedTextNode._bgRect.stroke('red');
        selectedTextNode._bgRect.strokeWidth(2);
        selectedTextNode._bgRect.strokeEnabled(true);
        
        // ✅ SỬA: Force update transformer để hiển thị border vàng ngay lập tức
        if (selectedTextNode._transformer) {
            try {
                selectedTextNode._transformer.forceUpdate();
            } catch (e) {}
        }
    }
    
    console.log("✅ Text selected:", selectedTextNode.text().substring(0, 20) + "...");
    drawingLayer.batchDraw();
}

// Hàm bỏ chọn text node
function deselectTextNode() {
    if (selectedTextNode && selectedTextNode._bgRect) {
        selectedTextNode._bgRect.stroke('transparent');
        selectedTextNode._bgRect.strokeWidth(1);
        
        // ✅ Cập nhật transformer để áp dụng thay đổi
        if (selectedTextNode._transformer) {
            try {
                selectedTextNode._transformer.forceUpdate();
            } catch (e) {}
        }
    }
    selectedTextNode = null;
}

// Sửa lại moveSelectedTextToPosition để dùng PADDING từ textNode
function moveSelectedTextToPosition(x, y) {
    if (!selectedTextNode) {
        console.log("❌ No text selected to move");
        return;
    }
    
    try {
        console.log("🎯 Moving text from:", selectedTextNode.x(), selectedTextNode.y(), "to:", x, y);
        
        // ✅ SỬA: Sử dụng PADDING từ chính textNode
        const PADDING = selectedTextNode._padding || 8;
        
        // Đặt text node trực tiếp tại vị trí click (căn giữa)
        selectedTextNode.x(x - selectedTextNode.width() / 2);
        selectedTextNode.y(y - selectedTextNode.height() / 2);
        
        // ✅ Cập nhật background rect với PADDING chính xác
        if (selectedTextNode._bgRect) {
            selectedTextNode._bgRect.x(selectedTextNode.x() - PADDING);
            selectedTextNode._bgRect.y(selectedTextNode.y() - PADDING);
            selectedTextNode._bgRect.width(selectedTextNode.width() + PADDING * 2);
            selectedTextNode._bgRect.height(selectedTextNode.height() + PADDING * 2);
            
            // Đảm bảo border vàng vẫn hiển thị
            selectedTextNode._bgRect.stroke('red');
            selectedTextNode._bgRect.strokeWidth(2);
            selectedTextNode._bgRect.strokeEnabled(true);
        }
        
        // Cập nhật transformer
        if (selectedTextNode._transformer) {
            try {
                selectedTextNode._transformer.forceUpdate();
            } catch (e) {}
        }
        
        console.log(`✅ Text moved to: x=${Math.round(selectedTextNode.x())}, y=${Math.round(selectedTextNode.y())}`);
        drawingLayer.batchDraw();
        // update page attribute after programmatic move
        try { _updatePageForMovedText(selectedTextNode); } catch (e) {}
        
    } catch (error) {
        console.error("❌ Error moving text:", error);
    }
}

    // Ensure moveSelectedTextToPosition updates page attribute after move
    function _updatePageForMovedText(node) {
      try {
        if (!node) return;
        const absPos = node.getAbsolutePosition();
        if (isTwoPage()) {
          const newPage = typeof getCurrentPageForPoint === 'function' ? getCurrentPageForPoint(absPos.x, absPos.y) : node.getAttr('page');
          node.setAttr('page', newPage);
          if (node._bgRect) node._bgRect.setAttr('page', newPage);
        } else {
          node.setAttr('page', 1);
          if (node._bgRect) node._bgRect.setAttr('page', 1);
        }
      } catch (err) {
        // ignore
      }
    }



// Hàm để thêm sự kiện click vào stage (gọi khi khởi tạo)
function initMoveMode() {
    if (stage && stage.container()) {
        console.log("🔧 Initializing move mode with container events");
        
        const container = stage.container();
        
        // Remove existing listeners
        container.removeEventListener('click', handleContainerClick);
        stage.off('click tap');
        
        // Add container event (more reliable)
        container.addEventListener('click', handleContainerClick);
        container.addEventListener('touchstart', handleContainerClick);
        
        // Also keep Konva events as backup
        stage.on('click tap', handleStageClick);
        
        console.log("✅ Move mode events attached to container");
    } else {
        console.log("❌ Stage container not available");
    }
}

// Hàm xử lý sự kiện container
function handleContainerClick(ev) {
    console.log("🎯 Container click event");
    handleStageClick(ev);
}

// Hàm utility để kiểm tra xem move mode có đang active không
function isMoveModeActive() {
    return isMoveMode;
}

// Thêm vào phần export/public functions nếu bạn có module pattern
// Ví dụ:
// return {
//     createText,
//     loadTexts,
//     saveTextNodes,
//     deleteTextNode,
//     updateFontSizeForZoom,
//     enableMoveMode,
//     disableMoveMode,
//     isMoveModeActive,
//     initMoveMode
// };

// Hàm để bỏ chọn text node hiện tại
function clearTextSelection() {
    deselectTextNode();
    console.log("🗑️ Text selection cleared");
}

// Sửa hàm disableMoveMode
function disableMoveMode() {
    isMoveMode = false;
    deselectTextNode(); // Bỏ chọn text khi tắt move mode
    if (stage && stage.container()) {
        stage.container().style.cursor = "default";
    }
    console.log("❌ Move mode disabled");
}

// Sửa phần cuối file - đảm bảo stage đã tồn tại
function initializeTextUtils() {
    // Đợi một chút để đảm bảo stage đã được tạo
    setTimeout(() => {
        if (stage) {
            initMoveMode();
            // enableMoveMode();
            console.log("✅ Text utils initialized with move mode");
        } else {
            console.log("❌ Stage not ready, retrying...");
            initializeTextUtils(); // Retry
        }
    }, 100);
}
