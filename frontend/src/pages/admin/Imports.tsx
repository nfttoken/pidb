import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Flex,
  Result,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { CheckCircleOutlined, CloudUploadOutlined, DownloadOutlined, FileExcelOutlined, ReloadOutlined, WarningOutlined } from "@ant-design/icons";

import { confirmImport, downloadImportErrorsCsv, downloadProductsCsv, getImportPreview, uploadCsv, validateImport } from "../../api/imports";
import { useAuthStore } from "../../stores/auth";
import type { ImportPreview, ImportResult } from "../../types/imports";

const modeLabels = { upsert: "Upsert by product code", create_only: "Create only", update_only: "Update only" } as const;

function Summary({ preview }: { preview: ImportPreview }) {
  return <Descriptions bordered size="small" column={{ xs: 1, sm: 4 }}>
    <Descriptions.Item label="File">{preview.filename}</Descriptions.Item>
    <Descriptions.Item label="Rows">{preview.total_rows}</Descriptions.Item>
    <Descriptions.Item label="Valid"><Tag color="success">{preview.valid_rows}</Tag></Descriptions.Item>
    <Descriptions.Item label="Errors"><Tag color={preview.error_rows ? "error" : "success"}>{preview.error_rows}</Tag></Descriptions.Item>
  </Descriptions>;
}

export function Imports() {
  const user = useAuthStore().user;
  const queryClient = useQueryClient();
  const canImport = user?.role === "admin" || user?.role === "editor";
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [preview, setPreview] = useState<ImportPreview>();
  const [result, setResult] = useState<ImportResult>();
  const [mode, setMode] = useState<keyof typeof modeLabels>("upsert");
  const uploadMutation = useMutation({ mutationFn: (file: File) => uploadCsv(file), onSuccess: (value) => { setPreview(value); setResult(undefined); message.success("CSV uploaded and validated"); }, onError: () => message.error("CSV could not be uploaded") });
  const revalidateMutation = useMutation({ mutationFn: (batchId: string) => validateImport(batchId), onSuccess: async (_, batchId) => { setPreview(await getImportPreview(batchId)); message.success("CSV validation refreshed"); }, onError: () => message.error("CSV validation failed") });
  const confirmMutation = useMutation({ mutationFn: ({ batchId, importMode }: { batchId: string; importMode: keyof typeof modeLabels }) => confirmImport(batchId, importMode), onSuccess: (value) => { setResult(value); void queryClient.invalidateQueries({ queryKey: ["products"] }); message.success("Import completed"); }, onError: () => message.error("Import could not be confirmed") });

  function chooseFile(nextFiles: UploadFile[]) {
    setFileList(nextFiles.slice(-1));
    const file = nextFiles.at(-1)?.originFileObj;
    if (file && canImport) uploadMutation.mutate(file);
  }

  function reset() {
    setFileList([]);
    setPreview(undefined);
    setResult(undefined);
    setMode("upsert");
  }

  if (result) return <Space direction="vertical" size={24} style={{ display: "flex" }}><Flex justify="space-between" align="flex-start" wrap="wrap" gap={16}><div><Typography.Title level={2} style={{ margin: 0 }}>Import result</Typography.Title><Typography.Text type="secondary">{result.filename}</Typography.Text></div><Button icon={<ReloadOutlined />} onClick={reset}>New import</Button></Flex><Result status="success" title="Import completed" subTitle={`${result.total_rows} rows processed`} /><Flex gap={16} wrap="wrap"><Card><Typography.Text type="secondary">Created</Typography.Text><Typography.Title level={3}>{result.created}</Typography.Title></Card><Card><Typography.Text type="secondary">Updated</Typography.Text><Typography.Title level={3}>{result.updated}</Typography.Title></Card><Card><Typography.Text type="secondary">Skipped</Typography.Text><Typography.Title level={3}>{result.skipped}</Typography.Title></Card></Flex></Space>;

  return (
    <Space direction="vertical" size={24} style={{ display: "flex" }}>
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={16}><div><Typography.Title level={2} style={{ margin: 0 }}>CSV Import</Typography.Title><Typography.Text type="secondary">Upload, validate, preview, and import product data</Typography.Text></div><Space><Button icon={<DownloadOutlined />} onClick={() => void downloadProductsCsv()}>Export products</Button><Button icon={<ReloadOutlined />} onClick={reset}>Reset</Button></Space></Flex>
      {!canImport && <Alert type="warning" showIcon message="Your role can review products but cannot import CSV files." />}
      <Steps current={preview ? 1 : 0} items={[{ title: "Upload", icon: <CloudUploadOutlined /> }, { title: "Validate & preview", icon: <FileExcelOutlined /> }, { title: "Confirm", icon: <CheckCircleOutlined /> }]} />
      {!preview ? <Card title="Upload CSV"><Upload accept=".csv" maxCount={1} fileList={fileList} beforeUpload={() => false} onChange={({ fileList: nextFiles }) => chooseFile(nextFiles)} onRemove={() => { setFileList([]); return true; }} disabled={!canImport}><Button icon={<CloudUploadOutlined />} loading={uploadMutation.isPending}>Choose CSV file</Button></Upload><Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>UTF-8 CSV is required. Multi-value fields use the `|` separator.</Typography.Paragraph></Card> : <>
        <Summary preview={preview} />
        {preview.error_rows > 0 && <Alert type="error" showIcon icon={<WarningOutlined />} message={`${preview.error_rows} row${preview.error_rows === 1 ? "" : "s"} need attention`} description="Rows with validation errors will be skipped. Fix the source CSV and upload it again for a clean import." />}
        <Card title="Validation errors" extra={<Button icon={<DownloadOutlined />} disabled={!preview.error_rows} onClick={() => void downloadImportErrorsCsv(preview.id)}>Export errors</Button>}><Table rowKey="id" size="small" dataSource={preview.errors} pagination={{ pageSize: 10 }} locale={{ emptyText: "No validation errors" }} columns={[{ title: "Row", dataIndex: "row_number", key: "row" }, { title: "Field", dataIndex: "field_name", key: "field" }, { title: "Code", dataIndex: "error_code", key: "code" }, { title: "Message", dataIndex: "message", key: "message" }, { title: "Value", dataIndex: "raw_value", key: "value" }]} /></Card>
        <Card title="Preview"><Table rowKey={(row, index) => `${preview.id}-${index}`} size="small" scroll={{ x: 900 }} dataSource={preview.rows} pagination={{ pageSize: 8 }} columns={Object.keys(preview.rows[0] ?? {}).map((key) => ({ title: key, dataIndex: key, key, ellipsis: true }))} /></Card>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}><Button onClick={() => revalidateMutation.mutate(preview.id)} loading={revalidateMutation.isPending}>Revalidate</Button><Space wrap><Select value={mode} onChange={setMode} options={Object.entries(modeLabels).map(([value, label]) => ({ value, label }))} /><Button type="primary" disabled={!canImport || preview.error_rows > 0} loading={confirmMutation.isPending} onClick={() => confirmMutation.mutate({ batchId: preview.id, importMode: mode })}>Confirm import</Button></Space></Flex>
      </>}
    </Space>
  );
}
