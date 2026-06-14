// Matriz de competencias de evaluación (portada de la vanilla, js/11).
export const EVAL_ITEMS: Record<string, { label: string; items: string[] }> = {
  tecnicas: { label: 'Competencias técnicas', items: [
    'Conocimiento del producto/servicio', 'Habilidades técnicas específicas', 'Uso de herramientas/computacionales',
    'Calidad del trabajo (precisión, detalle)', 'Cumplimiento con normas de seguridad y salud', 'Reportes y documentación',
    'Gestión del tiempo y priorización', 'Mantenimiento de equipos e infraestructura', 'Innovación en procesos y mejora continua', 'Análisis y resolución de problemas'] },
  interpersonales: { label: 'Competencias interpersonales', items: [
    'Trabajo en equipo', 'Comunicación efectiva', 'Manejo de conflictos', 'Empatía y relaciones interpersonales', 'Escucha activa',
    'Colaboración entre departamentos', 'Capacitación y mentoría a compañeros', 'Adaptabilidad a la diversidad cultural', 'Networking y construcción de relaciones', 'Influencia y persuasión'] },
  desempeno: { label: 'Desempeño', items: [
    'Cumplimiento de objetivos a corto plazo', 'Cumplimiento de objetivos a largo plazo', 'Iniciativa y proactividad', 'Adaptabilidad a cambios',
    'Capacidad para asumir responsabilidades adicionales', 'Contribución a la cultura organizacional', 'Innovación y creatividad', 'Gestión de estrés y presión',
    'Contribución a proyectos o iniciativas especiales', 'Cumplimiento de plazos y entrega de trabajo'] },
  liderazgo: { label: 'Liderazgo (si aplica)', items: [
    'Visión y establecimiento de metas', 'Motivación y desarrollo del equipo', 'Toma de decisiones efectiva', 'Evaluación del desempeño del equipo',
    'Gestión de cambios y transiciones', 'Fomento de un ambiente inclusivo y diverso', 'Desarrollo del plan de carrera de los colaboradores',
    'Establecimiento de un clima de confianza y respeto', 'Gestión de conflictos dentro del equipo', 'Visibilidad en la organización'] },
};
export const EVAL_LABELS: Record<number, string> = { 1: 'Muy Deficiente', 2: 'Deficiente', 3: 'Satisfactorio', 4: 'Bueno', 5: 'Excelente' };
