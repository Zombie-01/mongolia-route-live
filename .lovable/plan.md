
## Зорилго

Demo-г илүү бодит болгох: GPS таслагдаад эргэж асахад сүүлийн байршил автоматаар сэргээгдэх, вагоныг цагаар тооцох, админ газрын зураг дээр чирж байршил шинэчлэх, гар утсанд тохирсон map/list toggle, олон цэгт буулгах хүргэлт үүсгэх, Lovable Cloud-той холбож dummy хэрэглэгчид нэмэх.

## Үндсэн өөрчлөлтүүд

### 1. GPS resume + offline tracking (`src/lib/store.tsx`, `src/lib/demo-data.ts`)
- `Shipment`-д `gpsOnline: boolean`, `lastGpsAt: string`, `lastKnownPos: LatLng` талбарууд нэмнэ.
- Жолоочийн дэлгэц дээр "GPS унтраах / асаах" товч (`src/routes/driver.tsx`). Унтрахад `gpsOnline=false` болж `lastKnownPos` хадгална. Эргэж асахад сүүлийн байршлаас үргэлжилнэ + одоогийн ETA-р цааш илгээгдэнэ.
- Вагоны хувьд (`type==="wagon"`) GPS байхгүй гэж үзэн simulation loop нь зөвхөн өнгөрсөн хугацааг үндэслэн `progress`-ийг нэмэгдүүлж "тооцоолсон" байршил харуулна. Маркер дээр "EST" badge харагдана.

### 2. Drag-to-override on map (`src/components/FleetMap.tsx`)
- Админ үед маркер `draggable: true`. Drag дуусахад `overridePosition(id, latlng)` дуудна.
- Дрэйг хийх үед route polyline дээрх хамгийн ойрхон цэг рүү "snap" хийнэ (route polyline дээр projection).
- `ShipmentDetailModal` дотроос lat/lng input хэсгийг авч хаяна — оронд нь "Газрын зураг дээр чирж зөөнө үү" гэсэн зөвлөмж.

### 3. Mobile-first map/list toggle (`src/routes/dashboard.tsx`, `src/routes/track.tsx`)
- Жижиг дэлгэц дээр (`md` доош) "Газрын зураг / Жагсаалт" гэсэн segmented toggle. Тom дэлгэц дээр хоёул зэрэг харагдана.
- Sidebar-ыг доод drawer/bottom-sheet хэлбэрээр гар утсанд тохируулна.
- AppShell-ийг мобайл-найрсаг болгож navigation-г доод tab bar хэлбэртэй болгоно.

### 4. Multi-dropoff form (`src/components/ShipmentFormModal.tsx`)
- Олон буулгах цэг нэмэх/хасах боломжтой dynamic list (`+ цэг нэмэх` товч).
- Цэг бүрт: байршил (`cities.ts`-ээс сонголт), холбогдох хүн, утас, тэр цэгт буулгах ачаа items (нэр, тоо, нэгж).
- ETA болон зам автоматаар суурин газруудаар дамжуулан үүснэ (`suggestWaypoints`).

### 5. Lovable Cloud + dummy users
- Cloud идэвхжүүлнэ.
- `profiles`, `user_roles` (admin|driver|customer) хүснэгт үүсгэнэ. RLS + `has_role` security definer function.
- 3 dummy account seed хийнэ:
  - `admin@demo.mn` / `demo1234` — admin
  - `driver@demo.mn` / `demo1234` — driver
  - `customer@demo.mn` / `demo1234` — customer
- Login дэлгэцэн дээр "Demo Login" товчнууд эдгээр account-руу бодит `signInWithPassword` дуудна (mock биш). Mock fallback хадгална хэрэв Cloud disable бол.

## Файлын өөрчлөлт

- Шинээр: migrations (profiles, user_roles, roles enum, has_role), `src/lib/auth.ts`.
- Засна: `src/lib/demo-data.ts`, `src/lib/store.tsx`, `src/components/FleetMap.tsx`, `src/components/ShipmentDetailModal.tsx`, `src/components/ShipmentFormModal.tsx`, `src/components/AppShell.tsx`, `src/routes/index.tsx`, `src/routes/dashboard.tsx`, `src/routes/driver.tsx`, `src/routes/track.tsx`.

## Тодруулга шаардлагатай

Лавлая: Lovable Cloud-г одоо идэвхжүүлэх үү? Эсвэл одоохондоо demo-г mock хэвээр үлдээж зөвхөн UI/UX (GPS resume, drag-override, mobile toggle, multi-dropoff form)-г л хийх үү? Cloud асаах нь хэдэн секунд авах ба data persistence гарна.
