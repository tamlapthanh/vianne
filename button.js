// ---- non-canvas UI handlers ----

$(document).ready( function () {
    
  $("#logout").on("click", function () {
    if (confirm("Are you sure you want to logout?")) {
      AuthService.logout();
    }
  });


 // Xử lý sự kiện change
    $('#showTwoOrOnePage').change(function() {
        // Cập nhật biến IS_DUAL_PAGE
        IS_DUAL_PAGE = this.checked;
        
        // Cập nhật label
        updatePageDisplayLabel();
        
       // QUAN TRỌNG: Tính toán lại page dựa trên mode mới
        const currentUIPage = CURRENT_PAGE_INDEX;
        let newPage;
        
        if (IS_DUAL_PAGE) {
            // Đang chuyển từ Mobile → Desktop (1 page → 2 pages)
            // Giữ nguyên UI Page, nhưng hiển thị 2 JSON Pages
            // Ví dụ: UI Page 3 → Hiển thị JSON 5 & 6
            newPage = Math.max(1, Math.ceil(currentUIPage / 2));
            
        } else {
            // Đang chuyển từ Desktop → Mobile (2 pages → 1 page)
            // Chuyển đổi UI Page về giá trị phù hợp
            // Ví dụ: Desktop đang xem JSON 5 & 6 (UI Page 3)
            //        Chuyển sang Mobile → UI Page 5 (nếu direct mapping)
            newPage = Math.max(1, currentUIPage * 2 - 1);
        }
        
        // Cập nhật CURRENT_PAGE_INDEX và dropdown
        CURRENT_PAGE_INDEX = newPage;
        MAX_PAGE_NUM = SET_MAX_PAGE_NUM;
        if (isTwoPage()) {
          MAX_PAGE_NUM = parseInt(SET_MAX_PAGE_NUM/2);  
        }

        popDropdown($("#json-dropdown"), "Page", MIN_PAGE_NUM, MAX_PAGE_NUM, CURRENT_PAGE_INDEX);        
        
        // Gọi loadPage với page mới
        window.App.loadPage(newPage);
    });


  // $('input[name="book_options"]').on("click", function () {
  //   var selectedValue = $(this).val();
  //   // var currentPageIndex = $(this).data("current-page-index");
  //   // var maxPageNum = $(this).data("max-page-num");
  //   // var minPageNum = $(this).data("min-page-num");
  //   // var fetchInfo = $(this).data("fetch") ? true : false;
  //   if (selectedValue === "math_page") {
  //     window.location.href = "math.html";
  //   } else if (DATA_TYPE !== selectedValue) {
  //     DATA_TYPE = selectedValue;
  //     //setPageInfo(DATA_TYPE, currentPageIndex, maxPageNum, minPageNum,fetchInfo);
  //     setPageInfo(DATA_TYPE);
  //     popDropdown($("#json-dropdown"),"Page", MIN_PAGE_NUM, MAX_PAGE_NUM, CURRENT_PAGE_INDEX);
  //     APP_DATA = null;
  //     loadPage();
  //     $("#settingsModal").modal("hide");
  //   }
  // });  

  $("#add-rect-btn").on("click", function () {
    CanvasManager.addRect();
  });

  $("#add-text-btn").on("click", async function () {
    try {
      const text = (await navigator.clipboard.readText())?.trim() || "";

      // Nếu không có text hoặc quá 500 ký tự thì không truyền text vào
      if (!text || text.length > 500) {
        CanvasManager.addText(); // dùng mặc định
      } else {
        // ✂️ Split theo dấu / .split("/")
        const parts = text          
          .split(text.includes(';') ? ';' : '\n')
          .map((t) => t.trim())
          .filter((t) => t.length > 0 && t.length <= 50); // bỏ trống & quá dài

        // Nếu có nhiều đoạn → tạo nhiều text node
        if (parts.length > 0) {
          parts.forEach((t) => CanvasManager.addText(t));
        } else {
          CanvasManager.addText(); // nếu không có phần hợp lệ → tạo mặc định
        }
      }
    } catch (err) {
      console.error("Không thể đọc clipboard:", err);
      CanvasManager.addText(); // fallback
    }
  });

  $("#toggle-zoom-btn").on("click", function () {
    toggleButtons("zoom-controls-btn", "toggle-zoom-btn");
  });

  // Zoom & draw & lock buttons (some are still in CanvasManager but UI toggles here)
  $("#draw-btn").on("click", function () {
    CanvasManager.toggleDrawing();
    $(this).toggleClass("btn-danger btn-dark");
  });



  $("#setting").on("click", function () {
    const controls = document.querySelector(".controls");
    if (controls.style.display === "none") {
      controls.style.display = "flex";
    } else {
      controls.style.display = "none";
      toggleDrawIcon(true);
    }
  });

  $("#id_ShowPanel").on("click", function () {
    let isAuto = !$(this).hasClass("btn-success");
    $(this).toggleClass("btn-success", isAuto).toggleClass("btn-dark", !isAuto);
    // toggle audio panel visibility
    if (isAuto)
      window.AudioService.showPanel && window.AudioService.showPanel();
    else window.AudioService.hidePanel && window.AudioService.hidePanel();
    window.AudioService.setAutoShowPanel(isAuto);
  });


  // $("#show-vocabulary-btn").on("click", function () {

  //   VocabModal.load(CURRENT_PAGE_INDEX); 
  //   const modal = new bootstrap.Modal(document.getElementById('vocabModal'));
  //   modal.show();
  // });

  $("#auto-play-btn").on("click", function () {
    const $btn = $(this);
    const $icon = $btn.find("i");

    if ($icon.hasClass("bi-play-btn")) {
      // BẬT AUTO PLAY
      $btn.removeClass("btn-success").addClass("btn-danger");
      $icon.removeClass("bi-play-btn").addClass("bi-pause-btn");

      startCountdownHTML(AUTO_PLAY_TIME);

      autoPlayInterval = setInterval(() => {
        startCountdownHTML(AUTO_PLAY_TIME);
      }, AUTO_PLAY_TIME * 1000);
    } else {
      // TẮT
      stopAutoPlay();
    }
  });

  $("#move-text-btn").on("click", function () {

      $(this).toggleClass("btn-secondary btn-primary");
      if (isMoveMode) {
        disableMoveMode();
               
      } else {
         enableMoveMode();
      }
  });    

    $("#lock-btn").on("click", function () {

    // replicate original toggleLockIcon behavior
    const icon = document.getElementById("lock-btn").querySelector("i");
    if (icon.classList.contains("bi-lock-fill")) {
      toggleLockIcon(false);
    } else {
      toggleLockIcon(true);
    }

  });

  // zoom buttons -> delegate to CanvasManager (so logic sống ở canvas.js)
  $("#zoom-in")
    .off("click")
    .on("click", function () {
      // optionally zoom around stage center
      CanvasManager.zoomIn();
    });

  $("#zoom-out")
    .off("click")
    .on("click", function () {
      CanvasManager.zoomOut();
    });

  $("#reset-zoom")
    .off("click")
    .on("click", function () {
      CanvasManager.resetZoom();
    });

  // undo button
  $("#undo-btn")
    .off("click")
    .on("click", function () {
      const ok = CanvasManager.undoLastLine();
      if (!ok) {
        // optional feedback
        showToast && showToast("Không có gì để undo", "info");
      }
    });

  $("#delete-line-btn")
    .off("click")
    .on("click", function () {
      const ok = CanvasManager.deleteSelectedLine();
      if (!ok) {
        // optional feedback
        showToast && showToast("Đâu có chọn gì đâu mừ xóa.", "info");
      }
    });

  $("#id_line_stroke_width").on("change", function () {
    CanvasManager.setLineStrokeWidth($(this).val());
  });

   // previous/next buttons
  $("#previous_page")
    .off("click")
    .on("click", function () {
    processNextPrePage(false);
  });

  $("#next_page")
    .off("click")
    .on("click", function () {
    processNextPrePage(true);
  });

  


});
