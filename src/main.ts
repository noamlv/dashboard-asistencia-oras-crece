import "./styles.css";
import rawData from "./data.json";

type MetricRow = { label: string; value: number };
type EventRow = {
  event_id: string;
  activity: string;
  event_name: string;
  event_date: string;
  modality: string;
  location: string;
  reported_attendance: number;
  verified_attendance: number;
  source_rows_available: number;
  identified_listed: number;
  counting_basis: string;
  source_file: string;
  note: string;
};
type DashboardData = {
  metadata: {
    generated_on: string;
    source_root: string;
    privacy: string;
    total_reported_attendance: number;
    total_verified_attendance: number;
    total_source_rows: number;
    reported_verified_gap: number;
    events_count: number;
    activities_count: number;
    identified_people: number;
    named_source_records: number;
    anonymous_source_records: number;
    repeat_identified_people: number;
    alerts_count: number;
  };
  activities: MetricRow[];
  modalities: MetricRow[];
  sectors: MetricRow[];
  events: EventRow[];
  quality_notes: string[];
};

const data = rawData as DashboardData;
const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("No se encontró el contenedor del dashboard.");
const root = app;

let selectedModality = "Todas";
let selectedView: "panorama" | "eventos" | "calidad" = "panorama";

const number = new Intl.NumberFormat("es-PE");
const date = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

function formatDate(value: string): string {
  return date.format(new Date(`${value}T00:00:00Z`)).replace(".", "");
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderBars(rows: MetricRow[], tone = "green"): string {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return `<div class="bar-list">${rows.map((row) => `
    <div class="bar-row">
      <div class="bar-label"><span>${escapeHtml(row.label)}</span><strong>${number.format(row.value)}</strong></div>
      <div class="bar-track"><div class="bar-fill ${tone}" style="width:${(row.value / max) * 100}%"></div></div>
    </div>`).join("")}</div>`;
}

function filteredEvents(): EventRow[] {
  return data.events
    .filter((event) => selectedModality === "Todas" || event.modality === selectedModality)
    .sort((left, right) => right.event_date.localeCompare(left.event_date));
}

function eventRows(): string {
  const rows = filteredEvents();
  return `<div class="event-list">${rows.map((event) => `
    <article class="event-row">
      <div class="event-date"><b>${formatDate(event.event_date)}</b><span>${escapeHtml(event.modality)}</span></div>
      <div class="event-copy"><p>${escapeHtml(event.activity)}</p><h3>${escapeHtml(event.event_name)}</h3><span>${escapeHtml(event.location)}</span></div>
      <div class="event-count"><strong>${number.format(event.verified_attendance)}</strong><span>verificables</span>${event.reported_attendance !== event.verified_attendance ? `<small>${number.format(event.reported_attendance)} declaradas</small>` : ""}</div>
    </article>`).join("")}</div>`;
}

function renderPanorama(): string {
  const virtual = data.modalities.find((row) => row.label === "Virtual")?.value ?? 0;
  const percentVirtual = (virtual / data.metadata.total_verified_attendance) * 100;
  return `
    <section class="section-heading"><div><p class="eyebrow">Panorama general</p><h2>Registros verificables por actividad</h2></div><p>Las cifras se sustentan en listas, firmas o respuestas individuales disponibles.</p></section>
    <div class="two-column">
      <article class="panel"><div class="panel-title"><div><h3>Participaciones por línea de actividad</h3><p>Una persona puede aparecer en varias sesiones.</p></div></div>${renderBars(data.activities)}</article>
      <article class="panel"><div class="panel-title"><div><h3>Modalidad de los eventos</h3><p>La modalidad se asigna al evento completo.</p></div></div>${renderBars(data.modalities, "purple")}</article>
    </div>
    <article class="finding"><span>Lectura</span><p>Los eventos clasificados como virtuales reúnen <strong>${percentVirtual.toFixed(1)}%</strong> de los registros verificables. La presentación oficial está clasificada como híbrida e incluye 453 respuestas obtenidas durante la transmisión.</p></article>
    <div class="two-column lower-grid">
      <article class="panel"><div class="panel-title"><div><h3>Personas identificadas o listadas por sector</h3><p>Distribución de ${number.format(data.metadata.identified_people)} personas presentes en fuentes nominales; su asistencia individual no siempre pudo confirmarse.</p></div></div>${renderBars(data.sectors, "gold")}</article>
      <article class="panel"><div class="panel-title"><div><h3>Participación reiterada</h3><p>Personas identificadas en más de una actividad o jornada.</p></div></div><div class="repeat-stat"><strong>${number.format(data.metadata.repeat_identified_people)}</strong><span>de ${number.format(data.metadata.identified_people)} personas identificadas</span><b>${((data.metadata.repeat_identified_people / data.metadata.identified_people) * 100).toFixed(1)}%</b></div></article>
    </div>`;
}

function renderEvents(): string {
  const modalities = ["Todas", ...new Set(data.events.map((event) => event.modality))];
  const total = filteredEvents().reduce((sum, event) => sum + event.verified_attendance, 0);
  return `
    <section class="section-heading controls-heading"><div><p class="eyebrow">Detalle de eventos</p><h2>Registros verificables por sesión</h2></div><label><span>Modalidad</span><select id="modality-filter">${modalities.map((modality) => `<option ${selectedModality === modality ? "selected" : ""}>${escapeHtml(modality)}</option>`).join("")}</select></label></section>
    <article class="filter-summary"><strong>${number.format(total)}</strong><span>registros verificables en ${filteredEvents().length} evento(s) seleccionados</span></article>
    ${eventRows()}`;
}

function renderQuality(): string {
  return `
    <section class="section-heading"><div><p class="eyebrow">Consistencia de la información</p><h2>Qué puede contarse con la base disponible</h2></div></section>
    <div class="definition-grid">
      <article class="definition-card"><h3>Participaciones verificables</h3><strong>${number.format(data.metadata.total_verified_attendance)}</strong><p>Listas, firmas o respuestas individuales disponibles para cada evento.</p></article>
      <article class="definition-card"><h3>Filas fuente conservadas</h3><strong>${number.format(data.metadata.total_source_rows)}</strong><p>Incluyen 35 personas listadas en el taller; solo se confirmaron 17 firmas y no fue posible vincularlas individualmente.</p></article>
      <article class="definition-card"><h3>Participaciones declaradas</h3><strong>${number.format(data.metadata.total_reported_attendance)}</strong><p>Total obtenido al sumar las cifras narradas en los informes, aunque no todas cuentan con registros individuales.</p></article>
    </div>
    <article class="panel notes-panel"><div class="panel-title"><div><h3>Alertas para validación</h3><p>Estas diferencias permanecen documentadas en la base interna.</p></div></div><ol>${data.quality_notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ol></article>
    <article class="finding"><span>Uso recomendado</span><p>Para reportar resultados sustentados en registros, utilice las <strong>${number.format(data.metadata.total_verified_attendance)} participaciones verificables</strong>. Mantenga las <strong>${number.format(data.metadata.total_reported_attendance)} participaciones declaradas</strong> como una cifra separada y sujeta a validación documental.</p></article>`;
}

function render(): void {
  const content = selectedView === "panorama" ? renderPanorama() : selectedView === "eventos" ? renderEvents() : renderQuality();
  root.innerHTML = `
    <header class="dashboard-header">
      <div class="header-copy"><p class="eyebrow">PROYECTO CRECE · MONITOREO Y EVALUACIÓN</p><h1>Participación en actividades implementadas por ORAS-CONHU</h1><p>Consolidación de listas de asistencia, registros nominales e informes de participación del proyecto.</p></div>
      <div class="brand-summary"><img src="./assets/logo-crece.png" alt="Proyecto CRECE" /><div><strong>${number.format(data.metadata.total_verified_attendance)}</strong><span>registros verificables</span></div></div>
    </header>
    <section class="kpi-grid" aria-label="Indicadores principales">
      <article><span>Participaciones verificables</span><strong>${number.format(data.metadata.total_verified_attendance)}</strong><small>Con lista, firma o respuesta individual</small></article>
      <article><span>Participaciones declaradas</span><strong>${number.format(data.metadata.total_reported_attendance)}</strong><small>No todas cuentan con registros individuales</small></article>
      <article><span>Eventos o sesiones</span><strong>${data.metadata.events_count}</strong><small>Entre febrero y septiembre de 2026</small></article>
      <article><span>Personas identificadas o listadas</span><strong>${number.format(data.metadata.identified_people)}</strong><small>Vinculadas entre fuentes nominales</small></article>
    </section>
    <nav class="tabs" aria-label="Secciones del dashboard">
      ${[["panorama", "Panorama"], ["eventos", "Eventos"], ["calidad", "Calidad de datos"]].map(([key, label]) => `<button type="button" data-view="${key}" class="${selectedView === key ? "active" : ""}">${label}</button>`).join("")}
    </nav>
    <section class="content">${content}</section>
    <footer><span>Proyecto CRECE · Monitoreo y Evaluación</span><span>Actualizado al ${formatDate(data.metadata.generated_on)}</span></footer>`;

  root.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedView = button.dataset.view as typeof selectedView;
      render();
    });
  });
  root.querySelector<HTMLSelectElement>("#modality-filter")?.addEventListener("change", (event) => {
    selectedModality = (event.target as HTMLSelectElement).value;
    render();
  });
}

render();
