"use client";

import { useState } from "react";
import { AppointmentList } from "./AppointmentList";
import { AvailabilityEditor } from "./AvailabilityEditor";
import { BookAppointmentForm } from "./BookAppointmentForm";
import { NewAppointmentForm } from "./NewAppointmentForm";

type Option = { id: string; name: string };

/** Recargar la lista y señalar la cita recién creada (destello breve en su fila). */
function useListRefresh() {
  const [reloadKey, setReloadKey] = useState(0);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const refresh = (createdId?: string | null) => {
    setHighlightId(createdId ?? null);
    setReloadKey((k) => k + 1);
  };
  return { reloadKey, highlightId, refresh };
}

/** Agenda del despacho: lista + programar cita + disponibilidad propia. */
export function StaffAgenda(props: {
  timeZone: string;
  currentUserId: string;
  lawyers: Option[] | null;
  clients: Option[];
  cases: { id: string; title: string; clientId: string | null }[];
}) {
  const { reloadKey, highlightId, refresh } = useListRefresh();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <AppointmentList mode="staff" timeZone={props.timeZone} reloadKey={reloadKey} highlightId={highlightId} />
      </div>
      <div className="space-y-6">
        <NewAppointmentForm
          currentUserId={props.currentUserId}
          lawyers={props.lawyers}
          clients={props.clients}
          cases={props.cases}
          onCreated={refresh}
        />
        <AvailabilityEditor lawyerId={props.currentUserId} onSaved={() => refresh()} />
      </div>
    </div>
  );
}

/** Citas del cliente: lista + pedir cita. */
export function ClientAgenda({
  timeZone,
  cases,
}: {
  timeZone: string;
  cases: { id: string; title: string }[];
}) {
  const { reloadKey, highlightId, refresh } = useListRefresh();
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <AppointmentList mode="client" timeZone={timeZone} reloadKey={reloadKey} highlightId={highlightId} />
      </div>
      <div className="lg:col-span-2">
        <BookAppointmentForm cases={cases} timeZone={timeZone} onBooked={(a) => refresh(a?.id)} />
      </div>
    </div>
  );
}
