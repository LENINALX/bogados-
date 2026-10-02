"use client";

import { useState } from "react";
import { AppointmentList } from "./AppointmentList";
import { AvailabilityEditor } from "./AvailabilityEditor";
import { BookAppointmentForm } from "./BookAppointmentForm";
import { NewAppointmentForm } from "./NewAppointmentForm";

type Option = { id: string; name: string };

/** Agenda del despacho: lista + programar cita + disponibilidad propia. */
export function StaffAgenda(props: {
  timeZone: string;
  currentUserId: string;
  lawyers: Option[] | null;
  clients: Option[];
  cases: { id: string; title: string; clientId: string | null }[];
}) {
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <AppointmentList mode="staff" timeZone={props.timeZone} reloadKey={reloadKey} />
      </div>
      <div className="space-y-6">
        <NewAppointmentForm
          currentUserId={props.currentUserId}
          lawyers={props.lawyers}
          clients={props.clients}
          cases={props.cases}
          onCreated={reload}
        />
        <AvailabilityEditor lawyerId={props.currentUserId} onSaved={reload} />
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
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <AppointmentList mode="client" timeZone={timeZone} reloadKey={reloadKey} />
      </div>
      <div className="lg:col-span-2">
        <BookAppointmentForm cases={cases} onBooked={() => setReloadKey((k) => k + 1)} />
      </div>
    </div>
  );
}
