import crypto from 'crypto';

export interface IrpInvoiceItem {
  itemDesc: string;
  isService: 'Y' | 'N';
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

export interface IrpInvoiceData {
  supplierGstin: string;
  buyerGstin?: string;
  buyerLegalName: string;
  documentType: 'INV' | 'CRN' | 'DBN';
  documentNumber: string;
  documentDate: string; // YYYY-MM-DD
  totalInvoiceValue: number;
  taxableValue: number;
  cgstValue: number;
  sgstValue: number;
  igstValue: number;
  items: IrpInvoiceItem[];
}

export interface IrpGeneratedResponse {
  success: boolean;
  irn: string; // 64-character hex string
  ackNo: number;
  ackDate: string;
  signedQrCodeUrl: string;
  signedInvoiceJwt: string;
  status: 'ACT' | 'CNL';
  ewbNumber?: string;
  ewbValidTill?: string;
  remarks: string;
}

/**
 * Mock generation of Invoice Reference Number (IRN) as per Indian GST e-Invoicing schema (NIC standard).
 * Generates deterministic or unique 64-character hash representing the signed digital e-invoice.
 */
export function mockGenerateIRN(invoiceData: Partial<IrpInvoiceData>): IrpGeneratedResponse {
  const seed = `${invoiceData.supplierGstin || '08AABCS1429B1Z2'}-${invoiceData.documentNumber || 'INV-001'}-${invoiceData.documentDate || new Date().toISOString()}-${Date.now()}`;
  const irn = crypto.createHash('sha256').update(seed).digest('hex').toUpperCase();

  const ackNo = Math.floor(100000000000 + Math.random() * 900000000000);
  const ackDate = new Date().toISOString();

  // Create mock signed QR string according to NIC standard
  const qrData = {
    irn,
    gstin: invoiceData.supplierGstin || '08AABCS1429B1Z2',
    docNo: invoiceData.documentNumber || 'INV-001',
    docDate: invoiceData.documentDate || new Date().toISOString().slice(0, 10),
    totVal: invoiceData.totalInvoiceValue || 0,
    items: (invoiceData.items || []).length,
    ackNo,
    ackDate,
  };
  const qrEncoded = Buffer.from(JSON.stringify(qrData)).toString('base64');
  const signedQrCodeUrl = `https://einvoice1.gst.gov.in/qr/view?data=${qrEncoded}`;

  const signedInvoiceJwt = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${qrEncoded}.mockSignature_eInvoice_NIC_Gov_In_${irn.slice(0, 16)}`;

  console.log(`\n🏛️ [IRP e-Invoice Mock Service] Generated IRN for Doc ${invoiceData.documentNumber || 'INV-001'}`);
  console.log(`   IRN    : ${irn}`);
  console.log(`   AckNo  : ${ackNo}`);
  console.log(`   QR URL : ${signedQrCodeUrl}`);

  return {
    success: true,
    irn,
    ackNo,
    ackDate,
    signedQrCodeUrl,
    signedInvoiceJwt,
    status: 'ACT',
    remarks: 'E-Invoice signed and validated by IRP simulator.',
  };
}

export const irpService = {
  mockGenerateIRN,
};

export default irpService;
