/**
 * A metric tile's accent. Most figures are read as plain numbers, so the default carries no color;
 * the others map a figure to a status token when the number itself has a good or a cautionary reading
 * — attendance is `success`, no-shows are `warning`, an unusable "nothing to average" is `muted`.
 */
export type MetricTone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
