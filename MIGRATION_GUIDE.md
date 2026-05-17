# Database Migration Guide

This document explains how to migrate from static demo data to Supabase.

## Prerequisites

✅ **Already Configured:**

- `.env` file with Supabase credentials (URL, keys)
- Supabase tables created (`shipments`, `stops`)
- Your Supabase connection is working

## Steps to Migrate

### 1. Run the Seed Migration

Run the seed migration to populate the database with demo shipments and stops:

```bash
# Using Supabase CLI
supabase db push

# Or manually execute the seed migration
# Copy the contents of: supabase/migrations/20260517_seed_demo_shipments.sql
# Paste into your Supabase SQL Editor and execute
```

### 2. Verify Data in Supabase

1. Go to [console.prisma.io](https://console.prisma.io) or Supabase console
2. Navigate to the SQL Editor
3. Run a test query:
   ```sql
   SELECT COUNT(*) FROM shipments;
   SELECT COUNT(*) FROM stops;
   ```
4. You should see 9 shipments and 14 stops

### 3. Test the Application

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Open the app in your browser (typically http://localhost:5173)

3. Log in with demo credentials:
   - **Admin**: admin@demo.mn / demo1234
   - **Driver**: driver@demo.mn / demo1234
   - **Customer**: customer@demo.mn / demo1234

4. The shipments should load from Supabase automatically

## What Changed

### Before Migration

- Shipments stored in `src/lib/demo-data.ts` (static, in-memory)
- Data reset on every app restart
- No persistence

### After Migration

- ✅ All shipments stored in Supabase database
- ✅ Data persists across sessions
- ✅ Real-time sync with Supabase
- ✅ Static data completely removed from codebase
- ✅ Scalable for production use

## Files Modified

| File                                                   | Changes                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `src/lib/store.tsx`                                    | Removed `initialShipments` import, loads from DB by default |
| `src/integrations/supabase/shipments.server.ts`        | **NEW** - Data service for Supabase queries                 |
| `supabase/migrations/20260517_seed_demo_shipments.sql` | **NEW** - Seed data migration                               |
| `.env`                                                 | Already has Supabase credentials                            |

## Development Tips

### Add New Shipments

```typescript
import { createShipment } from "@/integrations/supabase/shipments.server";

const newShipment = await createShipment({
  trackingId: "MN-2099",
  cargo: "New cargo",
  // ... other fields
});
```

### Update Shipment Status

```typescript
import { updateShipmentStatus } from "@/integrations/supabase/shipments.server";

await updateShipmentStatus(shipmentId, "delivered");
```

### Query from Supabase

```typescript
import { fetchShipments, fetchShipmentById } from "@/integrations/supabase/shipments.server";

const allShipments = await fetchShipments();
const singleShipment = await fetchShipmentById(shipmentId);
```

## Troubleshooting

### Shipments Not Loading?

1. Check `.env` file has correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
2. Verify you're logged in (credentials: admin@demo.mn / demo1234)
3. Check browser console for errors
4. Verify tables exist in Supabase: `shipments`, `stops`
5. Check that seed migration was executed

### Migration Failed?

1. Run migrations manually via Supabase dashboard
2. Copy the SQL from `supabase/migrations/20260517_seed_demo_shipments.sql`
3. Paste into SQL Editor and execute

### Still Seeing Old Static Data?

1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart dev server: `Ctrl+C` then `npm run dev`
3. Hard refresh browser: `Ctrl+Shift+R`

## Next Steps

- ✅ Migration complete!
- Deploy to production when ready
- Consider setting up RLS (Row Level Security) policies for multi-user access
- Monitor Supabase usage in console
