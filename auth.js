// auth.js

const AuthService = {
  API_BASE_URL: global_const.RUN_URL_SERVER,

  setToken(token, { persist = false } = {}) {
    sessionStorage.setItem("jwt_token", token);
  },
  getToken() {
    return sessionStorage.getItem("jwt_token") ;
  },

  // Lưu token vào localStorage
  // setToken(token) {
  //   localStorage.setItem("jwt_token", token);
  // },

  // // Lấy token
  // getToken() {
  //   return localStorage.getItem("jwt_token");
  // },

  // Xóa token (logout)
  removeToken() {
    sessionStorage.removeItem("jwt_token");
  },

  // Kiểm tra đã login chưa
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;

    // Kiểm tra token có hết hạn không
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp * 1000; // convert to milliseconds
      return Date.now() < exp;
    } catch (e) {
      return false;
    }
  },

  // Login
  // AuthService.login (cập nhật)
  async login(email, password) {
    const controller = new AbortController();
    const timeoutMs = 10000; // 10s timeout
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
        // with credentials? nếu backend dùng cookie, thêm:
        // credentials: 'include'
      });

      clearTimeout(timeout);

      // Nếu fetch thành công (có response), nhưng status không ok
      if (!response.ok) {
        // Nếu server trả body JSON mô tả lỗi, thử parse
        let errBody = null;
        try {
          errBody = await response.json();
        } catch (e) {
          /* ignore */
        }

        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            type: "invalid_credentials",
            status: response.status,
            message: errBody?.message || "Email hoặc mật khẩu không đúng",
          };
        }

        if (response.status === 400) {
          return {
            success: false,
            type: "validation_error",
            status: response.status,
            message: errBody?.message || "Yêu cầu không hợp lệ",
          };
        }

        if (response.status >= 500) {
          return {
            success: false,
            type: "server_error",
            status: response.status,
            message: errBody?.message || "Lỗi máy chủ, thử lại sau",
          };
        }

        // fallback cho status khác
        return {
          success: false,
          type: "server_error",
          status: response.status,
          message:
            errBody?.message ||
            `Lỗi: ${response.status} ${response.statusText}`,
        };
      }

      // OK => parse JSON và lưu token
      const data = await response.json();
      if (data.token) {
        this.setToken(data.token);
        return { success: true };
      } else {
        // server trả 200 nhưng không có token
        return {
          success: false,
          type: "server_error",
          message: "Không nhận được token từ server",
        };
      }
    } catch (err) {
      clearTimeout(timeout);
      // fetch sẽ ném TypeError cho network/CORS, AbortError cho timeout
      if (err.name === "AbortError") {
        return {
          success: false,
          type: "timeout",
          message: "Server không phản hồi (timeout)",
        };
      }
      // NOTE: CORS preflight blocked thường cho ra TypeError với message 'Failed to fetch'
      return {
        success: false,
        type: "network",
        message: err.message || "Lỗi kết nối mạng hoặc CORS",
      };
    }
  },
  // Logout
  logout() {
    this.removeToken();
    window.location.href = "login.html";
  },

  // Redirect to login nếu chưa authenticate
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = "login.html";

    }
  },

  // Thêm Authorization header vào fetch request
  getAuthHeaders() {
    const token = this.getToken();
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  },
};

// Login form handler (chỉ chạy trên trang login)
$(document).ready(function () {
  if ($("#loginForm").length) {
    $("#loginForm").on("submit", async function (e) {
      e.preventDefault();

      const email = $("#email").val();
      const password = $("#password").val();
      const errorMsg = $("#errorMessage");

      errorMsg.addClass("d-none");

      // 🌀 Hiện spinner
      showSpinner("spinnerOverlay", "#F54927");


    try {
        const result = await AuthService.login(email, password);

        if (result.success) {
          // hide trước khi chuyển trang để tránh flash overlay          
          hideSpinner();
          window.location.href = 'index.html';
          return;
        }

        // nếu không thành công, hiện lỗi
        errorMsg.removeClass('d-none');
        switch (result.type) {
          case 'invalid_credentials':
            errorMsg.text('Email hoặc mật khẩu không đúng. Vui lòng kiểm tra.');
            break;
          case 'validation_error':
            errorMsg.text(result.message || 'Dữ liệu nhập không hợp lệ.');
            break;
          case 'timeout':
            errorMsg.text('Máy chủ không phản hồi. Vui lòng thử lại sau.');
            break;
          case 'network':
            errorMsg.text('Không thể kết nối tới server. Kiểm tra kết nối hoặc CORS.');
            console.error('Network/CORS error:', result.message);
            break;
          case 'server_error':
          default:
            errorMsg.text(result.message || 'Lỗi máy chủ. Vui lòng thử lại sau.');
            console.error('Server error:', result);
            break;
        }
      } catch (ex) {
        console.error('Unexpected error during login', ex);
        $('#errorMessage').removeClass('d-none').text('Lỗi không xác định. Vui lòng thử lại.');
      } finally {
        // luôn ẩn overlay ở cuối
        hideSpinner();
      }

    });
  }
});
