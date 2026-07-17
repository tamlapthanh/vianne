// Kiểm tra authentication
AuthService.requireAuth();

$(document).ready(async function () {

  await loadOptions();

$(document).on("click", 'input[name="book_options"]', function () {
    var selectedValue = $(this).val();
    if (selectedValue === "math_page") {
        window.location.href = "math.html";
    } else if (DATA_TYPE !== selectedValue) {
        DATA_TYPE = selectedValue;
        setPageInfo(DATA_TYPE);
        popDropdown($("#json-dropdown"), "Page", MIN_PAGE_NUM, MAX_PAGE_NUM, CURRENT_PAGE_INDEX);
        APP_DATA = null;
        loadPage();
        $("#settingsModal").modal("hide");
    }
});

  // // UI inputs references
  // const iconSoundUrlInput = $("#icon-sound-url");
  // const iconXInput = $("#icon-x");
  // const iconYInput = $("#icon-y");

  // init AudioService
  AudioService.init({
    iconPathPlaying: ICON_PLAYING, // "assets/music_icon.svg"
    iconPathIdle: ICON_AUDIO, // "assets/play_icon.png"
    resetIcons: resetIcons,
    changeImageUrl: changeImageUrl,
    getSoundStartEnd: getSoundStartEnd,
    global_const: global_const,
    autoShowPanel: true,
    //   onClose: () => {
    //     console.log("Closed panel!");
    //     // $("#id_ShowPanel")
    //     //   .toggleClass("btn-dark", true)
    //     //   .toggleClass("btn-success", false);
    //     // window.AudioService.setAutoShowPanel(false);
    //   }
  });

  // --- Initialize CanvasManager ---
  CanvasManager.init({
    containerId: "canvas",
    stageConfig: {
      width: window.innerWidth,
      height: window.innerHeight,
      draggable: false,
    },
    global_const: global_const,
    resetIcons: resetIcons, // functions from this file, used by CanvasManager
    changeImageUrl: changeImageUrl,
    getSoundStartEnd: getSoundStartEnd,
    getIconSize: getIconSize,
    showToast: showToast,
    AudioService: window.AudioService,
    onToggleLock: function (isLock) {
      toggleLockIcon(isLock);
    },
    onLoadPagesDetailed: function (page) {
      // called by CanvasManager after background+icons loaded
      showPagesDetailed(String(page), true);
    },
    onPageChangeRequest: function (isNext) {
      // called by CanvasManager swipe -> we handle page index change & load
      processNextPrePage(isNext);
    },
    isNotMobile: isNotMobile,
    iconPathIdle: ICON_AUDIO,
    iconPathPlaying: ICON_PLAYING,
  });

 

  // load page: asks CanvasManager to load JSON
  function loadPage(currentPage=-1) {
    var page = currentPage;
    if (currentPage == -1) {
      page = parseInt($("#json-dropdown").val(), 10);
    }    
    CURRENT_PAGE_INDEX = page;
    $("#settingsModal").modal("hide");
    var pageIndex = getPageIndex(page);
    const urlJson = global_const.PATH_JSON.replace("X", pageIndex);
    CanvasManager.loadPage(page, urlJson);
  }

  $("#json-dropdown").on("change", function () {
    loadPage();
  });


function processSavePage(isPage1 = true) {
  if (!CanvasManager.getState().backgroundImage) {
    showToast("Không có background, không thể lưu!", "warning");
    return;
  }

  const isDualPage = isTwoPage();
  
  var imagePage = $("#json-dropdown").val();
  var jsonPage = getPageIndex(imagePage);
  if (!isPage1) {
    jsonPage = jsonPage + 1;
  }

  const targetPageNumber = isPage1 ? 1 : 2;
  
  console.log('💾 START SAVE PROCESS:', {
    imagePage,
    jsonPage,
    isPage1,
    targetPageNumber,
    isDualPage
  });
  
  const jsonData = CanvasManager.exportShapes(targetPageNumber);  
  
  console.log('📊 SAVE DATA CHECK:', {
    lines: jsonData.lines.length,
    texts: jsonData.texts.length,
    rects: jsonData.rects.length,
    rectsDetails: jsonData.rects
  });
  
  // ✅ KIỂM TRA: Nếu không có data thì không gửi lên server
  if (jsonData.lines.length === 0 && jsonData.texts.length === 0 && jsonData.rects.length === 0) {
    console.log(`❌ No data to save for page ${isPage1 ? 1 : 2}, skipping`);
    
    if (isPage1 && isDualPage) {
      // Desktop: tiếp tục với page 2
      processSavePage(false);
    } else {
      // Hoàn thành
      showToast("Lưu bài làm thành công!");
      APP_DATA = null;
      showPagesDetailed(imagePage.toString(), true);
    }
    return;
  }

  const dataToSend = {
    sheet_name: DATA_TYPE,
    page: jsonPage.toString(),
    json: JSON.stringify(jsonData),
  };

  console.log('🚀 SENDING TO SERVER:', {
    sheet_name: DATA_TYPE,
    page: jsonPage.toString(),
    jsonSize: JSON.stringify(jsonData).length
  });

  showSpinner("spinnerOverlay", "#F54927");
  fetch(global_const.API_LINE_KEY_METHOD, {
    method: "POST",
    headers: AuthService.getAuthHeaders(),
    body: JSON.stringify(dataToSend),
  })
    .then((resp) => {
      // FIX: Kiểm tra response status
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      return resp.text().then(text => text ? JSON.parse(text) : {});
    })
    .then((d) => {
      console.log(`✅ Saved page ${isPage1 ? 1 : 2}:`, {
        lines: jsonData.lines.length,
        texts: jsonData.texts.length, 
        rects: jsonData.rects.length
      });
      
      if (isPage1 && isDualPage) {
        // Desktop: gọi lưu page 2
        processSavePage(false);
      } else {
        // Mobile: hoàn thành sau page 1, Desktop: hoàn thành sau page 2
        showToast("Lưu bài làm thành công!");
        APP_DATA = null;
        showPagesDetailed(imagePage.toString(), true);
      }        
    })
    .catch((err) => {
      console.error("Save error:", err);
      showToast("Lỗi khi lưu: " + err.message, "danger");
    })
    .finally(() => hideSpinner());    
}


  // sendJsonToServer - using CanvasManager.exportShapes()
  $("#send-json").click(function () {
      processSavePage(true);
  });


  // load lines list (uses APP_DATA and shapes)
  function showPagesDetailed(imagePage = null, isClearCache = true) {    
    IS_EANBLE_SWIPE = true;

    if (typeof FETCH_DRAW_INFO === "undefined" || FETCH_DRAW_INFO === false) {
      // không cần phải load cho loại data type này vì nó không có draw gì cả.
      console.log(" không cần phải load cho loại data type này vì nó không có draw gì cả. ");
      return;
    }

    // if (APP_DATA == null) {
      showSpinner("spinnerOverlay_async_id", "#FFC0CB");
      const dataToSend = { sheet_name: DATA_TYPE, clear_cache: isClearCache };
      fetch(global_const.SERVER_API_ALL_METHOD, {
        method: "POST",
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify(dataToSend),
      })
      .then(async (res) => {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.json();
        })
        .then((data) => {
          // Get data of all pages.
          APP_DATA = new Map(Object.entries(data || {}));
          // load by image background page.
          CanvasManager.loadShapes(imagePage);
        })
        .catch((err) => console.error("Fetch error", err))
        .finally(() => hideSpinner("spinnerOverlay_async_id"));
    // } else {
    //   CanvasManager.loadShapes(imagePage);
    // }
  }

  // expose some functions globally for console/testing if desired
  window.App = {
    global_const,
    loadPage,
    showPagesDetailed,
    processNextPrePage,
    CanvasManager,
  };

  Coloris({
    onChange: (color, inputEl) => {
      if (!inputEl) return;

      // lấy data-target từ input
      const target = inputEl.dataset.target;

      if (target === "window") {
        console.log("Đang chọn màu cho:", target, "=>", color);
        CanvasManager.setLineColor(color);
      }

      // đóng popup Coloris sau khi chọn
      Coloris.close();
    },
  });

  // init UI: populate dropdowns and load initial page
  popDropdown($("#json-dropdown"),"Page", MIN_PAGE_NUM, MAX_PAGE_NUM,CURRENT_PAGE_INDEX);
  loadPage();

});
