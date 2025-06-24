import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://qwkswxihcrdbdxukakzb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3a3N3eGloY3JkYmR4dWtha3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3Mzk2NjgsImV4cCI6MjA2NjMxNTY2OH0.L5RuokONvLC1cpIW9_fow7wANWfZyQF5M4c1AcRc1xU"
);
const TABLE = "catatan_penjualan";

const form = document.getElementById("form-barang");
const namaBarang = document.getElementById("nama_barang");
const typeBelanja = document.getElementById("type_belanja");
const stokEl = document.getElementById("stok");
const hargaEl = document.getElementById("harga");
const totalEl = document.getElementById("total_harga");
const hasilEl = document.getElementById("hasil-belanja");
const notifEl = document.getElementById("notif-area");

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
const calcTotal = () => {
  totalEl.textContent = rupiah((+stokEl.value || 0) * (+hargaEl.value || 0));
};
stokEl.addEventListener("input", calcTotal);
hargaEl.addEventListener("input", calcTotal);

window.hapusItem = async (id) => {
  if (confirm("Hapus item?")) {
    await supabase.from(TABLE).delete().eq("id", id);
    load();
  }
};

window.hapusBulan = async (bulan, items) => {
  if (confirm(`Hapus semua data bulan ${bulan}?`)) {
    const ids = items.map((i) => i.id);
    await supabase.from(TABLE).delete().in("id", ids);
    load();
  }
};

window.editItem = async (item) => {
  const nama = prompt("Nama Barang", item.nama_barang);
  if (nama === null) return;
  const stok = parseInt(prompt("Stok", item.stok));
  const harga = parseInt(prompt("Harga", item.harga));
  const tipe = prompt("Tipe (bulanan/mingguan)", item.type_belanja);
  if (!nama || isNaN(stok) || isNaN(harga)) return alert("Input tidak valid");
  await supabase
    .from(TABLE)
    .update({
      nama_barang: nama,
      stok,
      harga,
      total: stok * harga,
      type_belanja: tipe,
    })
    .eq("id", item.id);
  load();
};

// Accordion toggle eksklusif
window.toggleAccordion = (id) => {
  document
    .querySelectorAll('[id^="konten-"]')
    .forEach((el) => el.classList.add("hidden"));
  document
    .querySelectorAll('[id^="icon-"]')
    .forEach((icon) => icon.classList.remove("rotate-180"));

  const el = document.getElementById(`konten-${id}`);
  const icon = document.getElementById(`icon-${id}`);

  const isOpen = !el.classList.contains("hidden");
  if (!isOpen) {
    el.classList.remove("hidden");
    icon.classList.add("rotate-180");
  }
};

const groupByBulan = (data) =>
  data.reduce((acc, i) => {
    const d = new Date(i.tanggal);
    const k = d.toLocaleString("id-ID", { month: "long", year: "numeric" });
    (acc[k] = acc[k] || []).push(i);
    return acc;
  }, {});

const render = (data) => {
  hasilEl.innerHTML = "";
  notifEl.innerHTML = "";
  if (!data.length) {
    notifEl.innerHTML =
      '<div class="text-gray-500">Belum ada data belanja.</div>';
    return;
  }

  const now = new Date();
  const bulanKey = now.toLocaleString("id-ID", {
    month: "long",
    year: "numeric",
  });

  if (
    !data.some((i) => {
      const d = new Date(i.tanggal);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
  ) {
    notifEl.innerHTML = `<div class="bg-red-100 text-red-800 p-4 rounded-lg shadow">💡 Anda belum belanja di bulan ${bulanKey}.</div>`;
  }

  const byBulan = groupByBulan(data);
  hasilEl.innerHTML = Object.entries(byBulan)
    .map(([bulan, items]) => {
      const cards = items
        .map(
          (it) => `
      <div class="bg-white/80 p-4 rounded-xl shadow transition hover:shadow-lg">
        <h4 class="font-semibold text-sky-700">${it.nama_barang}</h4>
        <p class="text-sm text-gray-500">${it.stok} × ${rupiah(it.harga)}</p>
        <p class="text-sm mb-2"><span class="font-semibold">Tipe:</span> ${
          it.type_belanja
        }</p>
        <div class="flex justify-between items-center">
          <span class="text-pink-600 font-bold">${rupiah(it.total)}</span>
          <div class="flex gap-2">
            <button onclick='editItem(${JSON.stringify(it).replace(
              /"/g,
              "&quot;"
            )})' class="text-yellow-500 hover:text-yellow-600">✏️</button>
            <button onclick='hapusItem(${
              it.id
            })' class="text-red-500 hover:text-red-600">🗑️</button>
          </div>
        </div>
      </div>`
        )
        .join("");

      const totalBulan = items.reduce((sum, i) => sum + i.total, 0);

      return `
      <div class="bg-white border border-sky-100 rounded-2xl shadow-md p-5 space-y-4">
<h3 class="text-xl font-bold text-sky-600 flex justify-between items-center">
  <span>${bulan}</span>
  <button onclick='hapusBulan("${bulan}", ${JSON.stringify(items).replace(
        /"/g,
        "&quot;"
      )})' class="text-red-400 hover:text-red-600 text-sm">
    🗑️
  </button>
</h3>
        <div class="max-h-[270px] overflow-y-auto space-y-3 pr-2">
          ${cards}
        </div>
        <div class="text-right text-sm text-sky-700 font-semibold pt-2 border-t">Total : ${rupiah(
          totalBulan
        )} </div>
      </div>`;
    })
    .join("");
};

async function load() {
  const { data } = await supabase
    .from(TABLE)
    .select("*")
    .order("tanggal", { ascending: false });
  render(data || []);
}
load();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const stok = +stokEl.value,
    harga = +hargaEl.value;
  const payload = {
    nama_barang: namaBarang.value,
    stok,
    harga,
    total: stok * harga,
    type_belanja: typeBelanja.value,
    tanggal: new Date().toISOString().split("T")[0],
  };
  await supabase.from(TABLE).insert(payload);
  form.reset();
  totalEl.textContent = "Rp 0";
  load();
});
