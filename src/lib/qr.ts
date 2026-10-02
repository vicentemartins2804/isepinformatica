import "server-only";
import QRCode from "qrcode";

// Cor escura da paleta Nord (nord0) sobre branco: mantém o contraste que os leitores precisam.
const COLORS = { dark: "#2e3440", light: "#ffffff" };

/** QR code do link da votação em SVG, para mostrar no painel e descarregar. */
export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: COLORS });
}

/** QR code em PNG com resolução para impressão (cartazes A4/A3). */
export function qrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: "png", width: 1200, margin: 2, errorCorrectionLevel: "M", color: COLORS });
}
