export type ImportError = {
  id: string;
  row_number: number;
  field_name: string | null;
  error_code: string;
  message: string;
  raw_value: string | null;
};

export type ImportBatch = {
  id: string;
  filename: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
};

export type ImportPreview = ImportBatch & {
  rows: Array<Record<string, string>>;
  errors: ImportError[];
};

export type ImportResult = ImportBatch & {
  created: number;
  updated: number;
  skipped: number;
};
