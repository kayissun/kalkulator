/* ========== script.js ========== */
/*
   Dokumentasi singkat per-syntax (Bahasa Indonesia).
   Tambahan komentar menjelaskan struktur dan sintaks utama.
   Tujuan: membantu memahami apa yang dilakukan setiap bagian.
*/

/* IIFE: Immediately Invoked Function Expression
   - Bentuk: (function(){ ... })();
   - Fungsi dieksekusi segera setelah didefinisikan.
   - Memisahkan scope variabel agar tidak mencemari global.
*/
(function () {
  // Mengambil elemen DOM:
  // - document.getElementById(id) mengembalikan elemen dengan id tertentu.
  // - document.querySelectorAll(selector) mengembalikan NodeList dari elemen yang cocok.
  const displayEl = document.getElementById("display");
  const buttons = document.querySelectorAll(".btn");

  // State aplikasi menggunakan let agar nilainya bisa diubah:
  let current = ""; // string ekspresi saat ini
  let lastWasOperator = false; // boolean: apakah input terakhir adalah operator
  let hasDot = false; // boolean: apakah angka saat ini sudah berisi titik desimal

  // Function declaration: fungsi biasa dideklarasikan menggunakan kata 'function'
  function updateDisplay(text) {
    // displayEl.textContent = ... memasukkan teks ke dalam elemen (aman, tidak mem-parsing HTML)
    // Operator || digunakan untuk fallback ("0" jika text falsy seperti "")
    displayEl.textContent = text || "0";
  }

  /* sanitizeExpression(expr)
     - String.prototype.replace dengan regex untuk mengganti simbol × dan ÷ ke * dan /
     - .replace(/×/g, "*") : g = global, mengganti semua kemunculan
  */
  function sanitizeExpression(expr) {
    return expr.replace(/×/g, "*").replace(/÷/g, "/");
  }

  /* safeEval(expr)
     - Membatasi karakter yang diizinkan menggunakan regex: hanya angka, operator, titik, spasi, dan tanda kurung.
     - Jika format tidak sesuai -> lempar Error (throw new Error(...)).
     - Memeriksa urutan operator ganda dengan regex.
     - Function("return " + expr)() digunakan sebagai cara ringkas mengeksekusi ekspresi matematika.
       Catatan keamanan: hanya aman karena input divalidasi sebelumnya; bukan sandbox sempurna.
  */
  function safeEval(expr) {
    if (!/^[0-9+\-*/().%\s]+$/.test(expr)) {
      throw new Error("Invalid characters"); // throw menghentikan eksekusi dan meneruskan kontrol ke catch
    }
    if (/[+\-*/%]{2,}/.test(expr.replace(/\s+/g, ""))) {
      throw new Error("Invalid operator sequence");
    }
    return Function("return " + expr)();
  }

  /* pressNumber(num)
     - Menangani input angka dan titik.
     - Jika titik (".") sudah ada di angka saat ini => diabaikan.
     - Jika titik sebagai awal angka baru, tambahkan "0." untuk hasil yang konsisten.
     - lastWasOperator digunakan untuk memutuskan apakah titik memulai angka baru.
     - updateDisplay dipanggil untuk memperbarui antarmuka.
  */
  function pressNumber(num) {
    if (num === ".") {
      if (hasDot) return; // mencegah lebih dari satu titik di satu angka
      if (current === "" || lastWasOperator) {
        current += "0."; // membuat angka 0.x saat titik pertama
        hasDot = true;
        lastWasOperator = false;
        updateDisplay(current);
        return;
      }
      hasDot = true;
    }

    current += num; // concatenation string untuk membentuk ekspresi
    lastWasOperator = false; // sekarang terakhir adalah angka
    updateDisplay(current);
  }

  /* pressOperator(op)
     - Menangani input operator (+ - * /).
     - Jika current kosong dan user menekan "-" -> mulai angka negatif.
     - Jika input terakhir sudah operator, ganti operator terakhir dengan yang baru (memudahkan koreksi).
     - lastWasOperator true setelah memasukkan operator.
     - hasDot direset karena angka baru akan dimulai setelah operator.
  */
  function pressOperator(op) {
    if (current === "" && op === "-") {
      current = "-";
      lastWasOperator = false;
      updateDisplay(current);
      return;
    }
    if (lastWasOperator) {
      current = current.slice(0, -1) + op; // slice untuk mengganti karakter terakhir
    } else {
      current += op;
    }
    lastWasOperator = true;
    hasDot = false;
    updateDisplay(current);
  }

  /* pressClear()
     - Mengatur ulang state ke kondisi awal.
     - updateDisplay("0") menampilkan nol.
  */
  function pressClear() {
    current = "";
    lastWasOperator = false;
    hasDot = false;
    updateDisplay("0");
  }

  /* pressPercent()
     - Konversi nilai saat ini menjadi persen (value / 100).
     - sanitizeExpression dan safeEval dipakai untuk mengevaluasi ekspresi secara aman.
     - try/catch menangani error evaluasi (mis. ekspresi tidak valid).
  */
  function pressPercent() {
    try {
      const expr = sanitizeExpression(current);
      const value = expr ? safeEval(expr) : 0;
      const percent = value / 100;
      current = String(percent); // String(...) mengonversi hasil ke string untuk display dan operasi selanjutnya
      updateDisplay(current);
    } catch (e) {
      updateDisplay("Error");
      current = "";
    }
  }

  /* pressToggleSign()
     - Mengubah tanda nilai saat ini (positif -> negatif, negatif -> positif).
     - Mencoba evaluasi current lalu membalik tanda.
     - Bila evaluasi gagal, fungsi diam (catch kosong).
  */
  function pressToggleSign() {
    if (!current) return;
    try {
      const expr = sanitizeExpression(current);
      const value = safeEval(expr);
      const toggled = -value;
      current = String(toggled);
      updateDisplay(current);
    } catch (e) {
      // Jika gagal (mis. ekspresi tidak lengkap), abaikan perubahan
    }
  }

  /* pressEquals()
     - Mengevaluasi ekspresi secara aman dan menampilkan hasil.
     - Menggunakan try/catch untuk menangani kesalahan input.
     - lastWasOperator direset; hasDot disesuaikan berdasarkan hasil.
  */
  function pressEquals() {
    try {
      const expr = sanitizeExpression(current);
      const result = safeEval(expr);
      current = String(result);
      updateDisplay(current);
      lastWasOperator = false;
      hasDot = current.includes("."); // includes memeriksa substring
    } catch (e) {
      updateDisplay("Error");
      current = "";
      lastWasOperator = false;
      hasDot = false;
    }
  }

  /* Menambahkan event listener ke tiap tombol.
     - NodeList.forEach: iterasi koleksi elemen.
     - btn.addEventListener("click", callback): daftarkan callback saat tombol diklik.
     - dataset: akses atribut data-* pada elemen HTML (contoh: data-num, data-action).
     - Switch statement: memilih aksi berdasarkan nilai action.
  */
  buttons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const num = btn.dataset.num; // undefined jika tidak ada atribut data-num
      const action = btn.dataset.action; // undefined jika tidak ada atribut data-action

      if (num !== undefined) {
        pressNumber(num);
        return;
      }

      switch (action) {
        case "+":
        case "-":
        case "*":
        case "/":
          pressOperator(action);
          break;
        case "=":
          pressEquals();
          break;
        case "clear":
          pressClear();
          break;
        case "percent":
          pressPercent();
          break;
        case "toggle-sign":
          pressToggleSign();
          break;
      }
    });
  });

  /* Keyboard support
     - window.addEventListener("keydown", ...) menangkap penekanan tombol
     - e.key berisi representasi tombol yang ditekan
     - e.preventDefault() mencegah aksi default browser (mis. Enter submit form)
     - Kondisi memeriksa angka, operator, Enter, Backspace, dan huruf 'c' untuk clear
  */
  window.addEventListener("keydown", (e) => {
    if ((e.key >= "0" && e.key <= "9") || e.key === ".") {
      pressNumber(e.key);
      e.preventDefault();
      return;
    }
    if (["+", "-", "*", "/"].includes(e.key)) {
      pressOperator(e.key);
      e.preventDefault();
      return;
    }
    if (e.key === "Enter" || e.key === "=") {
      pressEquals();
      e.preventDefault();
      return;
    }
    if (e.key === "Backspace") {
      // slice(0, -1) menghapus karakter terakhir dari string
      current = current.slice(0, -1);
      updateDisplay(current || "0");
      e.preventDefault();
      return;
    }
    if (e.key.toLowerCase() === "c") {
      pressClear();
      e.preventDefault();
      return;
    }
  });

  // Inisialisasi tampilan
  updateDisplay("0");
})();
