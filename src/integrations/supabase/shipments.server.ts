import { supabase } from "./client.server";
import type { Shipment, Dropoff, CargoItem } from "./types";

export type { Shipment, Dropoff, CargoItem };

/**
 * Fetch all shipments with their stops from Supabase
 */
export async function fetchShipments(): Promise<Shipment[]> {
  try {
    const { data: shipmentsData, error: shipmentsError } = await supabase
      .from("shipments")
      .select("*");

    if (shipmentsError) {
      console.error("Error fetching shipments:", shipmentsError);
      return [];
    }

    if (!shipmentsData || shipmentsData.length === 0) {
      return [];
    }

    // Fetch stops for all shipments
    const { data: stopsData, error: stopsError } = await supabase
      .from("stops")
      .select("*");

    if (stopsError) {
      console.error("Error fetching stops:", stopsError);
      return [];
    }

    // Group stops by shipment_id
    const stopsMap = new Map<string, any[]>();
    (stopsData || []).forEach((stop) => {
      const shipmentId = stop.shipment_id;
      if (!stopsMap.has(shipmentId)) {
        stopsMap.set(shipmentId, []);
      }
      stopsMap.get(shipmentId)!.push(stop);
    });

    // Convert DB rows to Shipment objects
    return shipmentsData.map((row) =>
      dbRowToShipment(row, stopsMap.get(row.id) || [])
    );
  } catch (error) {
    console.error("Failed to fetch shipments:", error);
    return [];
  }
}

/**
 * Fetch a single shipment with its stops
 */
export async function fetchShipmentById(id: string): Promise<Shipment | null> {
  try {
    const { data: shipmentData, error: shipmentError } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", id)
      .single();

    if (shipmentError || !shipmentData) {
      console.error("Error fetching shipment:", shipmentError);
      return null;
    }

    const { data: stopsData, error: stopsError } = await supabase
      .from("stops")
      .select("*")
      .eq("shipment_id", id);

    if (stopsError) {
      console.error("Error fetching stops:", stopsError);
      return null;
    }

    return dbRowToShipment(shipmentData, stopsData || []);
  } catch (error) {
    console.error("Failed to fetch shipment:", error);
    return null;
  }
}

/**
 * Create a new shipment
 */
export async function createShipment(shipment: Omit<Shipment, "id">) {
  try {
    const { data, error } = await supabase
      .from("shipments")
      .insert([
        {
          tracking_id: shipment.trackingId,
          status: shipment.status,
          type: shipment.type || "truck",
          country: shipment.country || "MN",
          cargo: shipment.cargo,
          origin: shipment.origin,
          destination: shipment.destination,
          route: shipment.route,
          road_route: shipment.roadRoute,
          progress: shipment.progress,
          position: shipment.position,
          speed: shipment.speed,
          eta: shipment.eta,
          driver_name: shipment.driver,
          driver_phone: shipment.driverPhone,
          driver_license: shipment.driverLicense,
          driver_experience: parseInt(shipment.driverExperience),
          driver_rating: shipment.driverRating,
          vehicle_id: shipment.vehicleId,
          plate_number: shipment.plateNumber,
          capacity: shipment.capacity,
          total_weight: shipment.totalWeight,
          shipper: shipment.shipper,
          consignee: shipment.consignee,
          cargo_items: shipment.cargoItems,
          gps_online: shipment.gpsOnline ?? true,
          last_gps_at: shipment.lastGpsAt,
          last_known_pos: shipment.lastKnownPos,
          manual_override: shipment.manualOverride ?? false,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to create shipment:", error);
    throw error;
  }
}

/**
 * Update shipment status
 */
export async function updateShipmentStatus(
  id: string,
  status: "in_transit" | "stopped" | "delivered" | "delayed"
) {
  try {
    const { data, error } = await supabase
      .from("shipments")
      .update({ status, updated_at: new Date() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to update shipment status:", error);
    throw error;
  }
}

/**
 * Update shipment position
 */
export async function updateShipmentPosition(
  id: string,
  position: [number, number],
  progress: number,
  speed: number
) {
  try {
    const { data, error } = await supabase
      .from("shipments")
      .update({
        position,
        progress,
        speed,
        gps_online: true,
        last_gps_at: new Date(),
        updated_at: new Date(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to update shipment position:", error);
    throw error;
  }
}

/**
 * Update stop status (mark as done/pending)
 */
export async function updateStopStatus(
  stopId: string,
  status: "pending" | "done"
) {
  try {
    const { data, error } = await supabase
      .from("stops")
      .update({ status })
      .eq("id", stopId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to update stop status:", error);
    throw error;
  }
}

/**
 * Convert database row to Shipment object
 */
function dbRowToShipment(row: any, stops: any[]): Shipment {
  const route = (row.route as [number, number][]) ?? [];
  const roadRoute = (row.road_route as [number, number][] | null) ?? undefined;
  const position =
    (row.position as [number, number]) ?? route[0] ?? [47.9184, 106.9177];
  const lastKnownPos =
    (row.last_known_pos as [number, number] | null) ?? undefined;
  const cargoItems = (row.cargo_items as CargoItem[]) ?? [];

  const dropoffs: Dropoff[] = stops
    .filter((st) => (st.seq as number) > 0)
    .sort((a, b) => (a.seq as number) - (b.seq as number))
    .map((st) => ({
      location: st.location as string,
      position: st.position as [number, number],
      items: (st.items as CargoItem[]) ?? [],
      eta: (st.eta as string) ?? "",
      status: (st.status as "pending" | "done") ?? "pending",
      contact: (st.contact as string) ?? undefined,
    }));

  const driverExp = row.driver_experience as number;

  return {
    id: row.id as string,
    trackingId: row.tracking_id as string,
    cargo: row.cargo as string,
    origin: row.origin as string,
    destination: row.destination as string,
    driver: row.driver_name as string,
    vehicleId: (row.vehicle_id as string) ?? "",
    status: (row.status as "in_transit" | "stopped" | "delivered" | "delayed"),
    route,
    roadRoute,
    progress: (row.progress as number) ?? 0,
    speed: (row.speed as number) ?? 0,
    eta: (row.eta as string) ?? "",
    position,
    type: (row.type as "truck" | "wagon") ?? "truck",
    country: (row.country as "MN" | "RU" | "CN") ?? "MN",
    gpsOnline: (row.gps_online as boolean) ?? true,
    lastGpsAt: (row.last_gps_at as string) ?? undefined,
    lastKnownPos,
    manualOverride: (row.manual_override as boolean) ?? false,
    driverPhone: (row.driver_phone as string) ?? "",
    driverLicense: (row.driver_license as string) ?? "",
    driverExperience: `${driverExp} жил`,
    driverRating: (row.driver_rating as number) ?? 0,
    plateNumber: (row.plate_number as string) ?? "",
    capacity: (row.capacity as string) ?? "",
    totalWeight: (row.total_weight as string) ?? "",
    shipper: (row.shipper as string) ?? "",
    consignee: (row.consignee as string) ?? "",
    cargoItems,
    dropoffs,
  };
}
