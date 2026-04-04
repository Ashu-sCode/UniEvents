export const STREAM_OPTIONS = [
  { value: 'Bachelor of Computer Application', label: 'Bachelor of Computer Application' },
  { value: 'Bachelor of Science', label: 'Bachelor of Science' },
  { value: 'Bachelor of Arts', label: 'Bachelor of Arts' },
  { value: 'Bachelor of Commerce', label: 'Bachelor of Commerce' },
  { value: 'Bachelor of Education', label: 'Bachelor of Education' },
  { value: 'Bachelor of Business Administration', label: 'Bachelor of Business Administration' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'Other', label: 'Other' },
] as const;

export type StreamValue = (typeof STREAM_OPTIONS)[number]['value'];
