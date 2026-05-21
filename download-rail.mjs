import { writeFileSync } from "fs";

const query = `[out:json][timeout:120];(way["railway"="rail"](42,80,62,140);>;);out body geom;`;

console.log("Татаж байна... (1-2 минут болж магадгүй)");

const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);

const res = await fetch(url, {
  method: "GET",
  headers: { Accept: "application/json" },
});

console.log("Status:", res.status);
if (!res.ok) {
  const txt = await res.text();
  console.error("Алдаа:", txt.slice(0, 300));
  process.exit(1);
}

const data = await res.json();
console.log(`Нийт элемент: ${data.elements.length}`);

writeFileSync("public/rail-mn-ru.json", JSON.stringify(data));
console.log("Хадгалагдлаа: public/rail-mn-ru.json");
