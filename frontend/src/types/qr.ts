export type QrResponse = {
  id: string;
  product_id: string;
  short_code: string;
  destination_type: string;
  target_url: string;
  status: string;
  created_at: string;
};

export type QrListItem = QrResponse & {
  product_code: string;
  product_name_en: string;
  product_status: string;
};
