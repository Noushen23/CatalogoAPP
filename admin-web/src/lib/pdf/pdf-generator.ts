/**
 * Generador de PDF en formato TIRILLA POS (80mm)
 * Diseño simple y compacto para impresoras térmicas
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos para los datos del pedido
interface OrderItem {
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  sku?: string;
}

interface ShippingAddress {
  nombre_completo?: string;
  telefono?: string;
  direccion: string;
  ciudad?: string;
  departamento?: string;
  codigo_postal?: string;
  referencias?: string;
}

interface OrderData {
  numero_orden: string;
  fecha_creacion: string;
  estado: string;
  metodo_pago?: string;
  items: OrderItem[];
  subtotal: number;
  descuento?: number;
  costo_envio?: number;
  impuestos?: number;
  total: number;
  notas?: string;
  direccion_envio?: ShippingAddress;
  usuario?: {
    nombre?: string;
    email?: string;
    telefono?: string;
  };
}

// Mapeo de estados a español
const estadosLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  en_proceso: 'En Proceso',
  enviada: 'Enviada',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
  reembolsada: 'Reembolsada',
};

// Mapeo de métodos de pago
const metodoPagoLabels: Record<string, string> = {
  wompi: 'Wompi',
  tarjeta: 'Tarjeta',
  pse: 'PSE',
  nequi: 'Nequi',
  bancolombia_transfer: 'Bancolombia',
};

/**
 * Formatea un número como moneda
 */
function formatCurrency(amount: number): string {
  return ` ${amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Formatea una fecha en español
 */
function formatDate(date: string, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  return format(new Date(date), formatStr, { locale: es });
}

/**
 * Genera un PDF en formato tirilla POS (80mm)
 */
export async function generateOrderPDF(orderData: OrderData): Promise<void> {
  // Formato tirilla POS: 80mm de ancho
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 297], // 80mm ancho x 297mm alto
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 4;
  const centerX = pageWidth / 2;
  let currentY = 5;

  // ========== ENCABEZADO ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('E-COMMERCE', centerX, currentY, { align: 'center' });
  currentY += 5;
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Calle 123 #45-67', centerX, currentY, { align: 'center' });
  currentY += 3;
  doc.text('Cucuta D.C., Colombia', centerX, currentY, { align: 'center' });
  currentY += 3;
  doc.text('Tel: +57 xxxxxxxxxxxxxxxxx', centerX, currentY, { align: 'center' });
  currentY += 3;
  doc.text('CORREEEOOOO', centerX, currentY, { align: 'center' });
  currentY += 5;

  // Linea separadora
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // FACTURA
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PEDIDO DE VENTA', centerX, currentY, { align: 'center' });
  currentY += 5;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`No: ${orderData.numero_orden}`, centerX, currentY, { align: 'center' });
  currentY += 3.5;
  doc.text(`${formatDate(orderData.fecha_creacion)}`, centerX, currentY, { align: 'center' });
  currentY += 3.5;
  doc.text(`Estado: ${estadosLabels[orderData.estado] || orderData.estado}`, centerX, currentY, { align: 'center' });
  currentY += 4;

  // Linea separadora
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // ========== CLIENTE ==========
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENTE', margin, currentY);
  currentY += 4;
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  if (orderData.usuario?.nombre) {
    doc.text(`Nombre: ${orderData.usuario.nombre}`, margin, currentY);
    currentY += 3;
  }
  if (orderData.usuario?.telefono) {
    doc.text(`Tel: ${orderData.usuario.telefono}`, margin, currentY);
    currentY += 3;
  }
  currentY += 2;

  // ========== DIRECCION DE ENVIO ==========
  if (orderData.direccion_envio && orderData.direccion_envio.direccion !== 'Sin direccion de envio') {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DIRECCION ENVIO', margin, currentY);
    currentY += 4;
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const addr = orderData.direccion_envio;
    
    if (addr.nombre_completo) {
      doc.text(`${addr.nombre_completo}`, margin, currentY);
      currentY += 3;
    }
    
    const addrLines = doc.splitTextToSize(addr.direccion, pageWidth - 2 * margin);
    doc.text(addrLines, margin, currentY);
    currentY += addrLines.length * 3;
    
    if (addr.ciudad || addr.departamento) {
      const location = [addr.ciudad, addr.departamento].filter(Boolean).join(', ');
      doc.text(location, margin, currentY);
      currentY += 3;
    }
    currentY += 2;
  }

  // Linea separadora
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // ========== PRODUCTOS ==========
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUCTOS', margin, currentY);
  currentY += 4;

  // Encabezado de tabla
  doc.setFontSize(7);
  doc.text('CANT', margin, currentY);
  doc.text('DESCRIPCION', margin + 12, currentY);
  doc.text('TOTAL', pageWidth - margin, currentY, { align: 'right' });
  currentY += 3;
  
  doc.setLineWidth(0.1);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 3;

  // Items
  doc.setFont('helvetica', 'normal');
  orderData.items.forEach((item, index) => {
    // Cantidad
    doc.text(item.cantidad.toString(), margin + 2, currentY);
    
    // Nombre del producto (con wrap si es necesario)
    const productLines = doc.splitTextToSize(item.producto_nombre, 42);
    doc.text(productLines, margin + 12, currentY);
    
    // Total del item
    doc.text(formatCurrency(item.subtotal), pageWidth - margin, currentY, { align: 'right' });
    
    currentY += productLines.length * 3;
    
    // SKU (si existe)
    if (item.sku) {
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text(`SKU: ${item.sku}`, margin + 12, currentY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      currentY += 3;
    }
    
    // Precio unitario
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(`${formatCurrency(item.precio_unitario)} x ${item.cantidad}`, margin + 12, currentY);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    currentY += 4;
    
    // Espacio entre items
    if (index < orderData.items.length - 1) {
      currentY += 1;
    }
  });

  currentY += 2;
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // ========== TOTALES ==========
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // Subtotal
  doc.text('Subtotal:', margin, currentY);
  doc.text(formatCurrency(orderData.subtotal), pageWidth - margin, currentY, { align: 'right' });
  currentY += 4;

  // Descuento (si existe)
  if (orderData.descuento && orderData.descuento > 0) {
    doc.text('Descuento:', margin, currentY);
    doc.text(`-${formatCurrency(orderData.descuento)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 4;
  }

  // Envío (si existe)
  if (orderData.costo_envio && orderData.costo_envio > 0) {
    doc.text('Envio:', margin, currentY);
    doc.text(formatCurrency(orderData.costo_envio), pageWidth - margin, currentY, { align: 'right' });
    currentY += 4;
  }

  // IVA (si existe)
  if (orderData.impuestos && orderData.impuestos > 0) {
    doc.text('IVA (19%):', margin, currentY);
    doc.text(formatCurrency(orderData.impuestos), pageWidth - margin, currentY, { align: 'right' });
    currentY += 4;
  }

  // Linea antes del total
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // TOTAL
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', margin, currentY);
  doc.text(formatCurrency(orderData.total), pageWidth - margin, currentY, { align: 'right' });
  currentY += 6;

  // Linea separadora
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // ========== METODO DE PAGO ==========
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const metodoPago = metodoPagoLabels[orderData.metodo_pago || ''] || orderData.metodo_pago || 'No especificado';
  doc.text(`Metodo de pago: ${metodoPago}`, margin, currentY);
  currentY += 5;

  // ========== NOTAS ==========
  if (orderData.notas && orderData.notas.trim() !== '') {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES:', margin, currentY);
    currentY += 3;
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const notasLines = doc.splitTextToSize(orderData.notas, pageWidth - 2 * margin);
    doc.text(notasLines, margin, currentY);
    currentY += notasLines.length * 3 + 3;
  }

  // ========== PIE DE PAGINA ==========
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Gracias por su compra!', centerX, currentY, { align: 'center' });
  currentY += 4;

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Documento generado electronicamente', centerX, currentY, { align: 'center' });
  currentY += 3;
  doc.text(formatDate(new Date().toISOString()), centerX, currentY, { align: 'center' });
  currentY += 5;

  // ========== VISTA PRELIMINAR PDF ==========
  const fileName = `Tirilla_${orderData.numero_orden}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  
  // Abrir vista preliminar en nueva ventana
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const pdfWindow = window.open(url, '_blank');
  
  if (pdfWindow) {
    pdfWindow.document.title = fileName;
  }
}

