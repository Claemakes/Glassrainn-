/**
 * PDF Export Functionality for GlassRain Elevate
 * 
 * This module provides functionality to export design plans as PDFs,
 * including renovation details, materials, costs, and labor estimates.
 */

// Using jsPDF for PDF generation
// Make sure jsPDF is included in your HTML: 
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

class DesignPlanExporter {
  constructor() {
    this.pdfDoc = null;
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margin = 15;
    this.lineHeight = 7;
    this.currentY = this.margin;
    this.pageCount = 1;
  }

  /**
   * Initialize a new PDF document
   */
  initDocument() {
    this.pdfDoc = new jspdf.jsPDF();
    this.pdfDoc.setFont('helvetica');
    this.currentY = this.margin;
    this.pageCount = 1;
    
    // Add GlassRain header
    this.addHeader();
  }

  /**
   * Add GlassRain branding header to the document
   */
  addHeader() {
    // Add logo or title
    this.pdfDoc.setFontSize(24);
    this.pdfDoc.setTextColor(218, 165, 32); // Gold color
    this.pdfDoc.text('GlassRain', this.margin, this.currentY);
    
    this.pdfDoc.setFontSize(12);
    this.pdfDoc.setTextColor(100, 100, 100);
    this.pdfDoc.text('Elevate Design Plan', this.margin + 50, this.currentY);
    
    // Add date
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    this.pdfDoc.setFontSize(10);
    this.pdfDoc.text(formattedDate, this.pageWidth - this.margin - 40, this.currentY);
    
    this.currentY += 10;
    
    // Add separator line
    this.pdfDoc.setDrawColor(218, 165, 32); // Gold color
    this.pdfDoc.setLineWidth(0.5);
    this.pdfDoc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    
    this.currentY += 10;
  }

  /**
   * Check if we need to add a new page based on remaining space
   * @param {number} requiredSpace - Space needed in mm
   */
  checkPageBreak(requiredSpace) {
    if (this.currentY + requiredSpace > this.pageHeight - this.margin) {
      this.pdfDoc.addPage();
      this.pageCount++;
      this.currentY = this.margin;
      
      // Add header to new page
      this.addHeader();
    }
  }

  /**
   * Add a section title to the document
   * @param {string} title - Section title
   */
  addSectionTitle(title) {
    this.checkPageBreak(15);
    
    this.pdfDoc.setFontSize(16);
    this.pdfDoc.setTextColor(50, 50, 50);
    this.pdfDoc.setFont('helvetica', 'bold');
    this.pdfDoc.text(title, this.margin, this.currentY);
    
    this.currentY += 8;
    
    // Add subtitle separator
    this.pdfDoc.setDrawColor(200, 200, 200);
    this.pdfDoc.setLineWidth(0.2);
    this.pdfDoc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    
    this.currentY += 5;
    
    // Reset font
    this.pdfDoc.setFont('helvetica', 'normal');
  }

  /**
   * Add a paragraph of text to the document
   * @param {string} text - Paragraph text
   */
  addParagraph(text) {
    this.checkPageBreak(10);
    
    this.pdfDoc.setFontSize(11);
    this.pdfDoc.setTextColor(70, 70, 70);
    
    // Split long text to fit within page width
    const textLines = this.pdfDoc.splitTextToSize(text, this.pageWidth - (this.margin * 2));
    
    // Check if the text would overflow to next page
    this.checkPageBreak(textLines.length * this.lineHeight);
    
    this.pdfDoc.text(textLines, this.margin, this.currentY);
    this.currentY += textLines.length * this.lineHeight + 2;
  }

  /**
   * Add a table with material costs to the document
   * @param {Array} materials - Array of material objects with name, quantity, and cost
   */
  addMaterialsTable(materials) {
    if (!materials || materials.length === 0) return;
    
    // Calculate required space
    const tableHeight = 10 + (materials.length * 8);
    this.checkPageBreak(tableHeight);
    
    // Table headers
    this.pdfDoc.setFontSize(10);
    this.pdfDoc.setTextColor(70, 70, 70);
    this.pdfDoc.setFont('helvetica', 'bold');
    
    const col1 = this.margin;
    const col2 = this.margin + 90;
    const col3 = this.margin + 120;
    const col4 = this.margin + 150;
    
    this.pdfDoc.text('Material', col1, this.currentY);
    this.pdfDoc.text('Quantity', col2, this.currentY);
    this.pdfDoc.text('Unit Price', col3, this.currentY);
    this.pdfDoc.text('Total', col4, this.currentY);
    
    this.currentY += 5;
    
    // Table separator line
    this.pdfDoc.setDrawColor(180, 180, 180);
    this.pdfDoc.setLineWidth(0.2);
    this.pdfDoc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    
    this.currentY += 5;
    
    // Reset font
    this.pdfDoc.setFont('helvetica', 'normal');
    
    // Table rows
    let totalCost = 0;
    materials.forEach(material => {
      // Format numbers
      const quantity = material.quantity || 1;
      const unitPrice = material.unitPrice || material.price || 0;
      const total = quantity * unitPrice;
      totalCost += total;
      
      this.pdfDoc.text(material.name, col1, this.currentY);
      this.pdfDoc.text(quantity.toString(), col2, this.currentY);
      this.pdfDoc.text(`$${unitPrice.toFixed(2)}`, col3, this.currentY);
      this.pdfDoc.text(`$${total.toFixed(2)}`, col4, this.currentY);
      
      this.currentY += 7;
      
      // Check page break for next row
      this.checkPageBreak(7);
    });
    
    // Total line
    this.pdfDoc.setDrawColor(180, 180, 180);
    this.pdfDoc.setLineWidth(0.2);
    this.pdfDoc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    
    this.currentY += 5;
    
    this.pdfDoc.setFont('helvetica', 'bold');
    this.pdfDoc.text('Total Materials Cost:', col3 - 30, this.currentY);
    this.pdfDoc.text(`$${totalCost.toFixed(2)}`, col4, this.currentY);
    
    this.currentY += 10;
    this.pdfDoc.setFont('helvetica', 'normal');
  }

  /**
   * Add labor cost estimation to the document
   * @param {Object} labor - Labor information with hours and rate
   */
  addLaborEstimate(labor) {
    if (!labor) return;
    
    this.checkPageBreak(20);
    
    this.addSectionTitle('Labor Estimate');
    
    const hours = labor.hours || 0;
    const rate = labor.rate || 0;
    const totalLabor = hours * rate;
    
    const laborText = `Estimated Labor: ${hours} hours at $${rate.toFixed(2)}/hour`;
    this.addParagraph(laborText);
    
    this.pdfDoc.setFont('helvetica', 'bold');
    this.pdfDoc.text(`Total Labor Cost: $${totalLabor.toFixed(2)}`, this.margin, this.currentY);
    this.currentY += 7;
    this.pdfDoc.setFont('helvetica', 'normal');
  }

  /**
   * Add contractor recommendations to the document
   * @param {Array} contractors - Array of contractor objects
   */
  addContractorRecommendations(contractors) {
    if (!contractors || contractors.length === 0) return;
    
    this.checkPageBreak(15 + (contractors.length * 15));
    
    this.addSectionTitle('Recommended Contractors');
    
    contractors.forEach(contractor => {
      this.pdfDoc.setFont('helvetica', 'bold');
      this.pdfDoc.text(contractor.name, this.margin, this.currentY);
      this.currentY += 5;
      
      this.pdfDoc.setFont('helvetica', 'normal');
      this.pdfDoc.setFontSize(10);
      
      if (contractor.specialty) {
        this.pdfDoc.text(`Specialty: ${contractor.specialty}`, this.margin + 5, this.currentY);
        this.currentY += 4;
      }
      
      if (contractor.rating) {
        this.pdfDoc.text(`Rating: ${contractor.rating}/5`, this.margin + 5, this.currentY);
        this.currentY += 4;
      }
      
      if (contractor.contact) {
        this.pdfDoc.text(`Contact: ${contractor.contact}`, this.margin + 5, this.currentY);
        this.currentY += 4;
      }
      
      this.currentY += 5;
    });
  }

  /**
   * Add design images to the document
   * @param {string} imageData - Base64 encoded image data
   * @param {string} captionText - Image caption
   */
  addDesignImage(imageData, captionText) {
    if (!imageData) return;
    
    // Space for image and caption
    this.checkPageBreak(90);
    
    // Add image (width: 160mm, height: auto)
    try {
      const imgWidth = 160;
      this.pdfDoc.addImage(imageData, 'JPEG', 
                          this.margin + 10, 
                          this.currentY, 
                          imgWidth, 
                          0, 
                          '', 
                          'FAST');
      
      // Move down based on image height (approximate)
      this.currentY += 80;
      
      // Add caption if provided
      if (captionText) {
        this.pdfDoc.setFontSize(9);
        this.pdfDoc.setTextColor(100, 100, 100);
        this.pdfDoc.setFont('helvetica', 'italic');
        
        const captionLines = this.pdfDoc.splitTextToSize(captionText, imgWidth);
        this.pdfDoc.text(captionLines, this.margin + 10, this.currentY);
        
        this.currentY += captionLines.length * 4 + 5;
      }
    } catch (error) {
      console.error('Error adding image to PDF:', error);
      this.addParagraph('Error: Could not add design image to the document.');
    }
  }

  /**
   * Add a footer with page numbers to all pages
   */
  addFooter() {
    const totalPages = this.pageCount;
    
    for (let i = 1; i <= totalPages; i++) {
      this.pdfDoc.setPage(i);
      
      this.pdfDoc.setFontSize(8);
      this.pdfDoc.setTextColor(150, 150, 150);
      
      // Footer text
      this.pdfDoc.text(
        'Created with GlassRain Elevate - The future of home improvement',
        this.margin,
        this.pageHeight - 10
      );
      
      // Page numbers
      this.pdfDoc.text(
        `Page ${i} of ${totalPages}`,
        this.pageWidth - this.margin - 20,
        this.pageHeight - 10
      );
    }
  }

  /**
   * Generate a complete design plan PDF
   * @param {Object} designData - Complete design plan data
   * @returns {Object} PDF document object
   */
  generateDesignPlanPDF(designData) {
    this.initDocument();
    
    // Add property information
    if (designData.property) {
      this.addSectionTitle('Property Information');
      
      const propertyInfo = `
        Address: ${designData.property.address || 'N/A'}
        Size: ${designData.property.size || 'N/A'} sq ft
        Year Built: ${designData.property.yearBuilt || 'N/A'}
      `.trim();
      
      this.addParagraph(propertyInfo);
    }
    
    // Add renovation details
    if (designData.renovation) {
      this.addSectionTitle('Renovation Details');
      this.addParagraph(designData.renovation.description || 'No renovation details provided.');
      
      if (designData.renovation.scope) {
        this.addParagraph(`Scope: ${designData.renovation.scope}`);
      }
      
      if (designData.renovation.timeline) {
        this.addParagraph(`Estimated Timeline: ${designData.renovation.timeline}`);
      }
    }
    
    // Add materials list
    if (designData.materials && designData.materials.length > 0) {
      this.addSectionTitle('Materials List');
      this.addMaterialsTable(designData.materials);
    }
    
    // Add labor estimate
    if (designData.labor) {
      this.addLaborEstimate(designData.labor);
    }
    
    // Add before/after images if available
    if (designData.images) {
      this.addSectionTitle('Design Visualization');
      
      if (designData.images.before) {
        this.addDesignImage(designData.images.before, 'Current Room Configuration');
      }
      
      if (designData.images.after) {
        this.addDesignImage(designData.images.after, 'Proposed Room Redesign');
      }
    }
    
    // Add contractor recommendations
    if (designData.contractors && designData.contractors.length > 0) {
      this.addContractorRecommendations(designData.contractors);
    }
    
    // Add total cost summary
    if (designData.totalCost) {
      this.checkPageBreak(20);
      
      this.addSectionTitle('Total Cost Summary');
      
      const materialsCost = designData.totalCost.materials || 0;
      const laborCost = designData.totalCost.labor || 0;
      const otherCosts = designData.totalCost.other || 0;
      const totalCost = materialsCost + laborCost + otherCosts;
      
      this.pdfDoc.setFontSize(11);
      this.pdfDoc.text(`Materials: $${materialsCost.toFixed(2)}`, this.margin + 10, this.currentY);
      this.currentY += 6;
      
      this.pdfDoc.text(`Labor: $${laborCost.toFixed(2)}`, this.margin + 10, this.currentY);
      this.currentY += 6;
      
      if (otherCosts > 0) {
        this.pdfDoc.text(`Other Costs: $${otherCosts.toFixed(2)}`, this.margin + 10, this.currentY);
        this.currentY += 6;
      }
      
      this.pdfDoc.setDrawColor(180, 180, 180);
      this.pdfDoc.setLineWidth(0.2);
      this.pdfDoc.line(this.margin + 10, this.currentY, this.margin + 80, this.currentY);
      this.currentY += 5;
      
      this.pdfDoc.setFont('helvetica', 'bold');
      this.pdfDoc.setFontSize(14);
      this.pdfDoc.setTextColor(218, 165, 32); // Gold color
      this.pdfDoc.text(`Total Project Cost: $${totalCost.toFixed(2)}`, this.margin, this.currentY);
      this.currentY += 10;
    }
    
    // Add notes and disclaimers
    this.checkPageBreak(20);
    this.addSectionTitle('Notes & Disclaimers');
    
    const disclaimerText = 
      "This design plan is an estimate based on current rates and available information. " +
      "Actual costs may vary based on contractor availability, material price fluctuations, " +
      "and unforeseen conditions discovered during the renovation process. We recommend " +
      "obtaining multiple quotes from licensed contractors before proceeding.";
    
    this.addParagraph(disclaimerText);
    
    // Add footer with page numbers
    this.addFooter();
    
    return this.pdfDoc;
  }

  /**
   * Save the PDF with a given filename
   * @param {string} filename - Desired filename (without extension)
   */
  savePDF(filename = 'GlassRain_Design_Plan') {
    if (!this.pdfDoc) {
      console.error('No PDF document has been generated yet.');
      return;
    }
    
    this.pdfDoc.save(`${filename}.pdf`);
  }

  /**
   * Open the PDF in a new window/tab
   */
  openPDF() {
    if (!this.pdfDoc) {
      console.error('No PDF document has been generated yet.');
      return;
    }
    
    const pdfDataUri = this.pdfDoc.output('datauristring');
    window.open(pdfDataUri, '_blank');
  }
}

// Export functionality for the main application
window.DesignPlanExporter = DesignPlanExporter;

// Example usage:
// 
// // Initialize exporter
// const exporter = new DesignPlanExporter();
// 
// // Create sample design data
// const designData = {
//   property: {
//     address: '123 Main St, Anytown, USA',
//     size: 2200,
//     yearBuilt: 1985
//   },
//   renovation: {
//     description: 'Kitchen remodel with new cabinets, countertops, and appliances.',
//     scope: 'Full kitchen renovation',
//     timeline: '4-6 weeks'
//   },
//   materials: [
//     { name: 'Quartz Countertop', quantity: 40, unitPrice: 75 },
//     { name: 'Kitchen Cabinets (set)', quantity: 1, unitPrice: 5000 },
//     { name: 'Stainless Steel Appliance Package', quantity: 1, unitPrice: 3500 },
//     { name: 'Ceramic Tile Flooring', quantity: 200, unitPrice: 8 },
//     { name: 'LED Recessed Lighting', quantity: 8, unitPrice: 35 }
//   ],
//   labor: {
//     hours: 120,
//     rate: 75
//   },
//   contractors: [
//     { 
//       name: 'Premier Kitchen Renovations',
//       specialty: 'Kitchen Remodeling',
//       rating: 4.8,
//       contact: '555-123-4567'
//     },
//     {
//       name: 'Accurate Countertops & Cabinets',
//       specialty: 'Custom Cabinetry',
//       rating: 4.7,
//       contact: '555-987-6543'
//     }
//   ],
//   totalCost: {
//     materials: 10380,
//     labor: 9000,
//     other: 1200
//   }
// };
// 
// // Generate the PDF
// exporter.generateDesignPlanPDF(designData);
// 
// // Save or open the PDF
// exporter.savePDF('Kitchen_Remodel_Plan');
// // OR
// exporter.openPDF();