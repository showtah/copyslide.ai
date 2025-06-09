
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface HtmlOutputTabProps {
  htmlContent: string;
  isLoading: boolean;
  imageForSlide: string | null;
  currentThought: string | null;
  error?: string | null;
  isTextEditModeActive: boolean;
  onToggleTextEditMode: (slideIndex: number) => void;
  isComponentEditModeActive: boolean;
  onToggleComponentEditMode: (slideIndex: number) => void;
  activeSlideIndex: number;
  htmlFeedback: string;
  isFeedbackModalOpen: boolean;
  onOpenFeedbackModal: (slideIndex: number) => void;
  onCloseFeedbackModal: (slideIndex: number) => void;
  onSubmitFeedback: (slideIndex: number, feedbackText: string) => void;
}

// Text edit mode function (internal, unchanged)
const _makeTextEditableInternal = (win: any, currentSlideIdx: number) => {
  const doc = win.document;
  const styleId = 'content-editable-styles-dynamic';
  if (doc.getElementById(styleId)) doc.getElementById(styleId).remove();
  
  const style = doc.createElement('style');
  style.id = styleId;
  style.textContent = `
    [contenteditable="true"] {
      outline: 2px dashed #38bdf8 !important; /* sky-500 */
      outline-offset: 2px !important;
      cursor: text !important;
      background-color: rgba(56, 189, 248, 0.1) !important;
    }
    [contenteditable="true"]:focus, [contenteditable="true"]:hover {
      outline: 2px solid #0ea5e9 !important; /* sky-600 */
      background-color: rgba(14, 165, 233, 0.15) !important;
    }
  `;
  doc.head.appendChild(style);

  const tagsToMakeEditable = ['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'a', 'td', 'th', 'blockquote', 'dt', 'dd', 'figcaption', 'summary', 'label', 'button'];
  const allElements = doc.body.querySelectorAll('*');
  allElements.forEach((el: HTMLElement) => {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.closest('script') || el.closest('style')) return;

    if (tagsToMakeEditable.includes(el.tagName.toLowerCase())) {
       const hasDirectText = Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
       const blockChildren = Array.from(el.children).filter(c => ['DIV', 'P', 'UL', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'NAV'].includes(c.tagName));
      
       if (hasDirectText || blockChildren.length === 0) {
          el.setAttribute('contenteditable', 'true');
       }
    } else if (el.tagName.toLowerCase() === 'div') {
        const hasDirectText = Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
        const onlyInlineChildrenOrText = Array.from(el.childNodes).every(
            n => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && win.getComputedStyle(n as Element).display.includes('inline'))
        );
        if (hasDirectText && onlyInlineChildrenOrText && el.children.length < 5) {
             el.setAttribute('contenteditable', 'true');
        }
    }
  });
  win.currentSlideIndexForEdit = currentSlideIdx;

  win._cleanupTextEditMode = () => {
    const doc = win.document;
    const styleElement = doc.getElementById(styleId);
    if (styleElement) styleElement.remove();
    doc.body.querySelectorAll('[contenteditable="true"]').forEach((el: HTMLElement) => {
      el.removeAttribute('contenteditable');
    });
    delete win._cleanupTextEditMode;
  };
};

// Component edit mode function (internal, MODIFIED for drag-and-drop and Chart.js editing)
const _makeComponentsEditableInternal = (win: any, currentSlideIdx: number) => {
  const doc = win.document;
  const styleId = 'component-editable-styles-dynamic';
  let selectedComponent: HTMLElement | null = null;
  let editToolbar: HTMLElement | null = null;
  let chartEditButton: HTMLButtonElement | null = null;
  let chartEditModal: HTMLElement | null = null;

  const eventListeners: Array<{el: EventTarget, type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions}> = [];

  // Drag-and-drop state variables
  let isDragging = false;
  let dragStartX: number, dragStartY: number;
  let initialElemLeft: number, initialElemTop: number;
  let draggedElementRef: HTMLElement | null = null;


  if (doc.getElementById(styleId)) doc.getElementById(styleId).remove();
  const style = doc.createElement('style');
  style.id = styleId;
  style.textContent = `
    ._component_interactive:hover:not(._component_selected) {
      outline: 2px dashed #2563eb !important; /* blue-600 */
      cursor: pointer !important;
    }
    ._component_selected {
      outline: 3px solid #ea580c !important; /* orange-600 */
      box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.3) !important;
    }
    ._component_edit_toolbar {
      position: absolute;
      background-color: rgba(30, 41, 59, 0.95); /* slate-800 with opacity */
      border: 1px solid #475569; /* slate-600 */
      border-radius: 6px;
      padding: 8px;
      z-index: 100001;
      display: flex;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }
    ._component_edit_toolbar button {
      background-color: #38bdf8; /* sky-500 */
      color: white;
      border: none;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    ._component_edit_toolbar button:hover {
      background-color: #0ea5e9; /* sky-600 */
    }
    ._component_edit_toolbar button.delete-btn {
      background-color: #ef4444; /* red-500 */
    }
    ._component_edit_toolbar button.delete-btn:hover {
      background-color: #dc2626; /* red-600 */
    }
    ._component_edit_toolbar button.chart-edit-btn {
      background-color: #10b981; /* emerald-500 */
    }
    ._component_edit_toolbar button.chart-edit-btn:hover {
      background-color: #059669; /* emerald-600 */
    }
    ._chart_edit_modal_overlay {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background-color: rgba(0,0,0,0.6);
      z-index: 100002;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    ._chart_edit_modal_content {
      background-color: #1f2937; /* dark-matter / slate-800 */
      color: #f3f4f6; /* light-text */
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.5);
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
    }
    ._chart_edit_modal_content h4 { font-size: 1.1em; margin-bottom: 10px; color: #7dd3fc; /* sky-300 */ }
    ._chart_edit_modal_content label { display: block; margin-top: 8px; margin-bottom: 3px; font-size: 0.9em; color: #cbd5e1; /* slate-300 */ }
    ._chart_edit_modal_content input[type="text"], ._chart_edit_modal_content input[type="number"] {
      width: 100%;
      padding: 8px;
      background-color: #334155; /* slate-700 */
      border: 1px solid #475569; /* slate-600 */
      color: #f3f4f6; /* light-text */
      border-radius: 4px;
      margin-bottom: 8px;
      box-sizing: border-box;
    }
    ._chart_edit_modal_content .dataset-group { margin-bottom: 15px; padding: 10px; border: 1px solid #334155; border-radius: 4px; }
    ._chart_edit_modal_content .modal-actions { margin-top: 20px; text-align: right; }
    ._chart_edit_modal_content .modal-actions button { margin-left: 10px; padding: 8px 15px; }
  `;
  doc.head.appendChild(style);

  const addTrackedListener = (el: EventTarget, type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    el.addEventListener(type, handler, options);
    eventListeners.push({el, type, handler, options});
  };
  
  const removeChartEditModal = () => {
    if (chartEditModal) {
      chartEditModal.remove();
      chartEditModal = null;
    }
  };

  const showChartDataEditModal = (chartInstance: any, canvasEl: HTMLElement) => {
    removeChartEditModal(); // Ensure any existing modal is gone

    const modalOverlay = doc.createElement('div');
    modalOverlay.className = '_chart_edit_modal_overlay';
    
    const modalContent = doc.createElement('div');
    modalContent.className = '_chart_edit_modal_content';
    modalOverlay.appendChild(modalContent);

    const title = doc.createElement('h3');
    title.textContent = 'チャートデータ編集';
    title.style.fontSize = '1.5em';
    title.style.color = '#38bdf8'; // sky-500
    title.style.marginBottom = '15px';
    modalContent.appendChild(title);

    // Labels
    const labelsSection = doc.createElement('div');
    const labelsTitle = doc.createElement('h4');
    labelsTitle.textContent = 'ラベル';
    labelsSection.appendChild(labelsTitle);
    const labelInputs: HTMLInputElement[] = [];
    chartInstance.data.labels.forEach((label: string, index: number) => {
      const labelInput = doc.createElement('input');
      labelInput.type = 'text';
      labelInput.value = label;
      labelInput.setAttribute('aria-label', `Label ${index + 1}`);
      labelsSection.appendChild(labelInput);
      labelInputs.push(labelInput);
    });
    modalContent.appendChild(labelsSection);

    // Datasets
    const datasetsSection = doc.createElement('div');
    const datasetsTitle = doc.createElement('h4');
    datasetsTitle.textContent = 'データセット';
    datasetsTitle.style.marginTop = '15px';
    datasetsSection.appendChild(datasetsTitle);
    
    const datasetControls: Array<{labelInput: HTMLInputElement, dataInputs: HTMLInputElement[]}> = [];

    chartInstance.data.datasets.forEach((dataset: any, dsIndex: number) => {
      const datasetGroup = doc.createElement('div');
      datasetGroup.className = 'dataset-group';
      
      const datasetLabelLabel = doc.createElement('label');
      datasetLabelLabel.textContent = `データセット ${dsIndex + 1} の名称:`;
      datasetGroup.appendChild(datasetLabelLabel);
      const datasetLabelInput = doc.createElement('input');
      datasetLabelInput.type = 'text';
      datasetLabelInput.value = dataset.label || `Dataset ${dsIndex + 1}`;
      datasetLabelInput.setAttribute('aria-label', `Dataset ${dsIndex + 1} Label`);
      datasetGroup.appendChild(datasetLabelInput);

      const dataInputs: HTMLInputElement[] = [];
      dataset.data.forEach((dataPoint: number, dpIndex: number) => {
        const dataPointLabel = doc.createElement('label');
        dataPointLabel.textContent = `データ点 ${dpIndex + 1}: (${chartInstance.data.labels[dpIndex] || ''})`;
        datasetGroup.appendChild(dataPointLabel);
        const dataInput = doc.createElement('input');
        dataInput.type = 'number';
        dataInput.value = dataPoint.toString();
        dataInput.step = 'any'; // Allow decimals
        dataInput.setAttribute('aria-label', `Dataset ${dsIndex + 1} Data Point ${dpIndex + 1}`);
        datasetGroup.appendChild(dataInput);
        dataInputs.push(dataInput);
      });
      datasetsSection.appendChild(datasetGroup);
      datasetControls.push({ labelInput: datasetLabelInput, dataInputs });
    });
    modalContent.appendChild(datasetsSection);

    // Actions
    const actionsDiv = doc.createElement('div');
    actionsDiv.className = 'modal-actions';

    const cancelButton = doc.createElement('button');
    cancelButton.textContent = 'キャンセル';
    cancelButton.style.backgroundColor = '#64748b'; // slate-500
    addTrackedListener(cancelButton, 'click', () => removeChartEditModal());
    
    const updateButton = doc.createElement('button');
    updateButton.textContent = '更新して閉じる';
    updateButton.style.backgroundColor = '#0ea5e9'; // sky-600
    addTrackedListener(updateButton, 'click', () => {
      // Update labels
      const newLabels = labelInputs.map(input => input.value);
      chartInstance.data.labels = newLabels;

      // Update datasets
      chartInstance.data.datasets.forEach((dataset: any, dsIndex: number) => {
        dataset.label = datasetControls[dsIndex].labelInput.value;
        dataset.data = datasetControls[dsIndex].dataInputs.map(input => parseFloat(input.value) || 0);
      });
      
      chartInstance.update();
      // Persist data to data-attribute on canvas
      if (canvasEl) {
        canvasEl.dataset.chartdata = JSON.stringify(chartInstance.data);
      }
      removeChartEditModal();
    });

    actionsDiv.appendChild(cancelButton);
    actionsDiv.appendChild(updateButton);
    modalContent.appendChild(actionsDiv);
    
    // Stop propagation for clicks inside modal content
    addTrackedListener(modalContent, 'click', e => e.stopPropagation());
    // Close modal on overlay click
    addTrackedListener(modalOverlay, 'click', () => removeChartEditModal());

    doc.body.appendChild(modalOverlay);
    chartEditModal = modalOverlay;
  };


  const createToolbar = () => {
    if (editToolbar) editToolbar.remove();
    editToolbar = doc.createElement('div');
    editToolbar.className = '_component_edit_toolbar';
    
    const deleteBtn = doc.createElement('button');
    deleteBtn.textContent = '削除';
    deleteBtn.className = 'delete-btn';
    addTrackedListener(deleteBtn, 'click', (e) => {
      e.stopPropagation();
      if (selectedComponent) {
        selectedComponent.remove();
        deselectComponent();
      }
    });

    const increaseBtn = doc.createElement('button');
    increaseBtn.textContent = '拡大';
     addTrackedListener(increaseBtn, 'click', (e) => {
      e.stopPropagation();
      if (selectedComponent) {
        let currentScale = parseFloat(selectedComponent.style.getPropertyValue('--component-scale') || '1');
        currentScale = parseFloat((currentScale + 0.1).toFixed(2));
        selectedComponent.style.setProperty('--component-scale', currentScale.toString());
        selectedComponent.style.transform = `scale(${currentScale})`;
        positionToolbar(); 
      }
    });
    
    const decreaseBtn = doc.createElement('button');
    decreaseBtn.textContent = '縮小';
    addTrackedListener(decreaseBtn, 'click', (e) => {
      e.stopPropagation();
      if (selectedComponent) {
        let currentScale = parseFloat(selectedComponent.style.getPropertyValue('--component-scale') || '1');
        currentScale = parseFloat(Math.max(0.1, currentScale - 0.1).toFixed(2));
        selectedComponent.style.setProperty('--component-scale', currentScale.toString());
        selectedComponent.style.transform = `scale(${currentScale})`;
        positionToolbar();
      }
    });

    chartEditButton = doc.createElement('button');
    chartEditButton.textContent = 'チャートデータ';
    chartEditButton.className = 'chart-edit-btn';
    chartEditButton.style.display = 'none'; // Initially hidden
    addTrackedListener(chartEditButton, 'click', (e) => {
        e.stopPropagation();
        if (selectedComponent && selectedComponent.tagName === 'CANVAS') {
            const chartId = selectedComponent.id;
            const chartInstance = win.Chart?.instances?.[chartId];
            if (chartInstance) {
                showChartDataEditModal(chartInstance, selectedComponent);
            } else {
                alert('選択されたキャンバスに関連付けられたチャートインスタンスが見つかりません。');
            }
        }
    });

    editToolbar.appendChild(deleteBtn);
    editToolbar.appendChild(increaseBtn);
    editToolbar.appendChild(decreaseBtn);
    editToolbar.appendChild(chartEditButton);
    doc.body.appendChild(editToolbar);
    editToolbar.style.display = 'none';
  };

  const positionToolbar = () => {
    if (selectedComponent && editToolbar) {
      const rect = selectedComponent.getBoundingClientRect();
      const scrollTop = win.pageYOffset || doc.documentElement.scrollTop;
      const scrollLeft = win.pageXOffset || doc.documentElement.scrollLeft;
      
      editToolbar.style.display = 'flex';
      let top = rect.top + scrollTop - editToolbar.offsetHeight - 8;
      let left = rect.left + scrollLeft;

      if (top < scrollTop + 5) {
         top = rect.bottom + scrollTop + 8;
      }
      if (left + editToolbar.offsetWidth > scrollLeft + win.innerWidth - 5) {
          left = scrollLeft + win.innerWidth - editToolbar.offsetWidth - 5;
      }
      if (left < scrollLeft + 5) {
          left = scrollLeft + 5;
      }
      editToolbar.style.top = `${top}px`;
      editToolbar.style.left = `${left}px`;
    }
  };

  const selectComponent = (el: HTMLElement) => {
    if (selectedComponent === el && editToolbar && editToolbar.style.display !== 'none') return;

    if (selectedComponent) {
      selectedComponent.classList.remove('_component_selected');
    }
    selectedComponent = el;
    if (selectedComponent) {
        selectedComponent.classList.add('_component_selected');
        if (!editToolbar) createToolbar();
        else editToolbar.style.display = 'flex'; // Ensure toolbar is visible

        // Show/hide chart edit button
        if (chartEditButton) {
            if (selectedComponent.tagName === 'CANVAS' && selectedComponent.id && win.Chart?.instances?.[selectedComponent.id]) {
                chartEditButton.style.display = 'inline-block';
            } else {
                chartEditButton.style.display = 'none';
            }
        }
        positionToolbar();
    } else {
        deselectComponent();
    }
  };

  const deselectComponent = () => {
    if (selectedComponent) {
      selectedComponent.classList.remove('_component_selected');
    }
    selectedComponent = null;
    if (editToolbar) {
      editToolbar.style.display = 'none';
      if (chartEditButton) chartEditButton.style.display = 'none';
    }
    removeChartEditModal();
  };

  // Drag and drop handlers
  const onDragMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    if (!selectedComponent || !selectedComponent.contains(e.target as Node) || (e.target as HTMLElement).closest('._component_edit_toolbar') || (e.target as HTMLElement).closest('._chart_edit_modal_overlay')) {
        return; // Not on selected or on its toolbar or on chart modal
    }

    draggedElementRef = selectedComponent;
    isDragging = false; // Will be set to true on first mousemove

    const computedStyle = win.getComputedStyle(draggedElementRef);
    if (computedStyle.position === 'static') {
        draggedElementRef.style.position = 'relative';
        // Initialize top/left if they are going to be used for relative positioning
        draggedElementRef.style.top = draggedElementRef.style.top || '0px';
        draggedElementRef.style.left = draggedElementRef.style.left || '0px';
    } else {
        // Ensure top/left are set if already positioned, fallback to 0px
        draggedElementRef.style.top = computedStyle.top !== 'auto' ? computedStyle.top : (draggedElementRef.style.top || '0px');
        draggedElementRef.style.left = computedStyle.left !== 'auto' ? computedStyle.left : (draggedElementRef.style.left || '0px');
    }
    
    initialElemLeft = parseFloat(draggedElementRef.style.left);
    initialElemTop = parseFloat(draggedElementRef.style.top);

    // If parsing failed (e.g. 'auto'), default to 0
    if (isNaN(initialElemLeft)) initialElemLeft = 0;
    if (isNaN(initialElemTop)) initialElemTop = 0;

    dragStartX = e.clientX;
    dragStartY = e.clientY;

    // Add listeners to document to capture mouse move anywhere
    doc.addEventListener('mousemove', onDragMouseMove);
    doc.addEventListener('mouseup', onDragMouseUp);
  };

  const onDragMouseMove = (e: MouseEvent) => {
      if (!draggedElementRef) return;

      if (!isDragging) {
          // First significant move, consider it dragging
          isDragging = true;
          // Optionally, add a class to the body or element for visual feedback (e.g., grabbing cursor)
          draggedElementRef.style.cursor = 'grabbing';
          // Higher z-index while dragging
          draggedElementRef.style.zIndex = '100002'; 
      }
      e.preventDefault(); // Prevent text selection or other default behaviors

      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      draggedElementRef.style.left = `${initialElemLeft + dx}px`;
      draggedElementRef.style.top = `${initialElemTop + dy}px`;

      positionToolbar(); // Keep toolbar positioned relative to the moving element
  };

  const onDragMouseUp = () => {
      if (draggedElementRef && isDragging) {
          // Reset cursor and z-index
          draggedElementRef.style.cursor = ''; 
          draggedElementRef.style.zIndex = ''; 
      }

      // Remove listeners from document
      doc.removeEventListener('mousemove', onDragMouseMove);
      doc.removeEventListener('mouseup', onDragMouseUp);

      isDragging = false;
      draggedElementRef = null;
  };
  
  addTrackedListener(doc, 'mousedown', onDragMouseDown, true);


  const componentSelector = 'div,p,span,h1,h2,h3,h4,h5,h6,li,a,img,table,ul,ol,section,article,aside,header,footer,figure,canvas,button,input,textarea,select';
  const elements = doc.body.querySelectorAll(componentSelector);

  elements.forEach((el: Element) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.tagName === 'BODY' || htmlEl.tagName === 'SCRIPT' || htmlEl.tagName === 'STYLE' || htmlEl.closest('script') || htmlEl.closest('style') || htmlEl.isContentEditable || htmlEl.classList.contains('_component_edit_toolbar') || htmlEl.closest('._component_edit_toolbar')) return;
    
    const rect = htmlEl.getBoundingClientRect();
    // Avoid making very small, empty, non-visual elements interactive, unless they are specific types like IMG or CANVAS
    if (rect.width < 10 && rect.height < 10 && htmlEl.children.length === 0 && !['IMG', 'CANVAS', 'INPUT', 'BUTTON'].includes(htmlEl.tagName)) return;

    htmlEl.classList.add('_component_interactive');
    const clickHandler = function(event: MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
      if (selectedComponent === htmlEl) {
        // If clicking the selected component again, and it's a chart, potentially re-open modal or focus toolbar.
        // For now, do nothing, or one could toggle the modal if it was for charts.
      } else {
        selectComponent(htmlEl);
      }
    };
    addTrackedListener(htmlEl, 'click', clickHandler);
  });
  
  const bodyClickHandler = function(event: MouseEvent) {
    if (isDragging) return; // Don't deselect if a drag operation just finished on the body
    // If clicked outside selected component and its toolbar, and not inside the chart modal
    if (selectedComponent && editToolbar && !editToolbar.contains(event.target as Node) && !selectedComponent.contains(event.target as Node) && (!chartEditModal || !chartEditModal.contains(event.target as Node))) {
      deselectComponent();
    }
  };
  addTrackedListener(doc.body, 'click', bodyClickHandler);
  
  // Reposition toolbar on scroll or resize
  const scrollOrResizeHandler = () => {
      if(selectedComponent) positionToolbar();
      if(chartEditModal && selectedComponent?.tagName === 'CANVAS' && win.Chart?.instances?.[selectedComponent.id]) {
        // If chart modal is open, could consider repositioning if it's not centered overlay
      }
  };
  addTrackedListener(win, 'resize', scrollOrResizeHandler);
  addTrackedListener(win, 'scroll', scrollOrResizeHandler, true); // Use capture for scroll

  win.currentSlideIndexForEdit = currentSlideIdx;
  win._cleanupComponentEditMode = () => {
    // Clean up drag and drop listeners and state
    doc.removeEventListener('mousemove', onDragMouseMove);
    doc.removeEventListener('mouseup', onDragMouseUp);
    if (isDragging && draggedElementRef) {
        draggedElementRef.style.cursor = '';
        draggedElementRef.style.zIndex = '';
    }
    isDragging = false;
    draggedElementRef = null;

    // Remove all tracked event listeners
    eventListeners.forEach(({el, type, handler, options}) => el.removeEventListener(type, handler, options));
    eventListeners.length = 0; // Clear the array

    removeChartEditModal();
    if (editToolbar) editToolbar.remove();
    doc.querySelectorAll('._component_interactive').forEach(el => el.classList.remove('_component_interactive', '_component_selected'));
    const styleElement = doc.getElementById(styleId);
    if (styleElement) styleElement.remove();
    selectedComponent = null;
    editToolbar = null;
    chartEditButton = null;
    delete win._cleanupComponentEditMode;
  };
};

// Unified save and cleanup function (internal, unchanged)
const _saveAndDisableAllEditsInternal = (win: any) => {
  const doc = win.document;
  let htmlModified = false;

  // Explicitly call cleanup for the active mode first
  if (typeof win._cleanupTextEditMode === 'function') {
    win._cleanupTextEditMode();
    htmlModified = true; // Assume modification if mode was active
  }
  if (typeof win._cleanupComponentEditMode === 'function') {
    win._cleanupComponentEditMode();
    htmlModified = true; // Assume modification if mode was active
  }

  // This part is a bit of a guess, if htmlModified is true, it means one of the modes *was* active.
  // The actual check for modifications would be more complex (e.g., comparing original HTML to current).
  // For now, if a mode was active and is now being disabled, we assume changes might have occurred.
  if (htmlModified) {
      // Clean up any temporary styles or attributes if necessary before saving
      // For example, if --component-scale is only for live editing and not to be saved:
      doc.querySelectorAll('[style*="--component-scale"]').forEach((el: HTMLElement) => {
        // el.style.removeProperty('--component-scale'); // Example cleanup
      });

      const updatedHtml = doc.documentElement.outerHTML;
      const slideIndex = win.currentSlideIndexForEdit;

      // Ensure slideIndex is valid before posting
      if (typeof slideIndex === 'number') {
        win.parent.postMessage({
          type: 'editedHtml',
          html: updatedHtml,
          slideIndex: slideIndex
        }, '*');
      }
  }
};

const CopyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 4.625v2.625m0 0H13.5m0 0V13.5m0 0h2.25m-2.25 0h-2.25m2.25 0H13.5m0 0V13.5m0 0h-2.25" />
  </svg>
);

const FeedbackIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.056 3 12s4.03 8.25 9 8.25Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75V12A2.25 2.25 0 0 0 9.75 9.75H9.375c-.31 0-.559.273-.526.58 1.113 2.173 2.832 3.42 4.651 3.42H12Zm0 0V15a2.25 2.25 0 0 0 2.25-2.25H12Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25h.01M15.75 8.25h.01M8.25 8.25h.01" />
  </svg>
);

const ExportIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const ExternalLinkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
);


const HtmlOutputTab: React.FC<HtmlOutputTabProps> = ({ 
  htmlContent, 
  isLoading, 
  imageForSlide, 
  currentThought, 
  error,
  isTextEditModeActive,
  onToggleTextEditMode,
  isComponentEditModeActive,
  onToggleComponentEditMode,
  activeSlideIndex,
  htmlFeedback,
  isFeedbackModalOpen,
  onOpenFeedbackModal,
  onCloseFeedbackModal,
  onSubmitFeedback,
}) => {
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('preview');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [copyButtonText, setCopyButtonText] = useState('コードをコピー');
  const [currentFeedbackText, setCurrentFeedbackText] = useState('');

  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentFeedbackText(htmlFeedback || '');
  }, [htmlFeedback, isFeedbackModalOpen]);

  const finalHtmlContent = useMemo(() => {
    return htmlContent;
  }, [htmlContent]);

  const handleToggleTextEditModeClick = () => {
    const iframe = iframeRef.current;
    if (viewMode !== 'preview' || !iframe || !iframe.contentWindow) {
      if (viewMode !== 'preview') alert("テキスト編集はプレビューモードでのみ利用可能です。");
      // Still toggle the state back if it was attempted to be turned on in wrong viewMode
      if (!isTextEditModeActive) onToggleTextEditMode(activeSlideIndex); 
      return;
    }
    
    const iframeWin = iframe.contentWindow as any;
    // If any edit mode is active, save and disable all first.
    if (isTextEditModeActive || isComponentEditModeActive) {
        if (typeof iframeWin._saveAndDisableAllEditsInternal === 'function') {
            iframeWin._saveAndDisableAllEditsInternal(iframeWin);
        }
    }
    // Then toggle the specific mode. The effect hook will handle enabling it.
    onToggleTextEditMode(activeSlideIndex);
  };

  const handleToggleComponentEditModeClick = () => {
    const iframe = iframeRef.current;
    if (viewMode !== 'preview' || !iframe || !iframe.contentWindow) {
      if (viewMode !== 'preview') alert("コンポーネント編集はプレビューモードでのみ利用可能です。");
      if (!isComponentEditModeActive) onToggleComponentEditMode(activeSlideIndex);
      return;
    }

    const iframeWin = iframe.contentWindow as any;
    if (isComponentEditModeActive || isTextEditModeActive) {
        if (typeof iframeWin._saveAndDisableAllEditsInternal === 'function') {
            iframeWin._saveAndDisableAllEditsInternal(iframeWin);
        }
    }
    onToggleComponentEditMode(activeSlideIndex);
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (viewMode === 'preview' && iframe && iframe.contentWindow && iframe.contentWindow.document.readyState === 'complete') {
      const iframeWin = iframe.contentWindow as any;
      
      // Ensure helper functions are available on the iframe window
      iframeWin._makeTextEditableInternal = _makeTextEditableInternal;
      iframeWin._makeComponentsEditableInternal = _makeComponentsEditableInternal;
      iframeWin._saveAndDisableAllEditsInternal = _saveAndDisableAllEditsInternal;

      // Call cleanup for other mode if switching, then activate desired mode
      if (isTextEditModeActive) {
        if (typeof iframeWin._cleanupComponentEditMode === 'function') iframeWin._cleanupComponentEditMode();
        if (typeof iframeWin._makeTextEditableInternal === 'function') iframeWin._makeTextEditableInternal(iframeWin, activeSlideIndex);
      } else if (isComponentEditModeActive) {
         if (typeof iframeWin._cleanupTextEditMode === 'function') iframeWin._cleanupTextEditMode();
        if (typeof iframeWin._makeComponentsEditableInternal === 'function') iframeWin._makeComponentsEditableInternal(iframeWin, activeSlideIndex);
      } else { // Neither mode active, ensure both are cleaned up
        if (typeof iframeWin._cleanupTextEditMode === 'function') iframeWin._cleanupTextEditMode();
        if (typeof iframeWin._cleanupComponentEditMode === 'function') iframeWin._cleanupComponentEditMode();
      }
    }
    // Add readyState check to dependencies for iframe content
  }, [htmlContent, viewMode, isTextEditModeActive, isComponentEditModeActive, activeSlideIndex, iframeRef.current?.contentWindow?.document?.readyState]);
  
  // Effect to handle iframe load and re-apply edit modes if necessary
  useEffect(() => {
    const iframe = iframeRef.current;
    const handleLoad = () => {
        if (viewMode === 'preview' && iframe && iframe.contentWindow) {
            const iframeWin = iframe.contentWindow as any;
            iframeWin._makeTextEditableInternal = _makeTextEditableInternal;
            iframeWin._makeComponentsEditableInternal = _makeComponentsEditableInternal;
            iframeWin._saveAndDisableAllEditsInternal = _saveAndDisableAllEditsInternal;

            if (isTextEditModeActive) {
                if (typeof iframeWin._makeTextEditableInternal === 'function') iframeWin._makeTextEditableInternal(iframeWin, activeSlideIndex);
            } else if (isComponentEditModeActive) {
                if (typeof iframeWin._makeComponentsEditableInternal === 'function') iframeWin._makeComponentsEditableInternal(iframeWin, activeSlideIndex);
            }
        }
    };

    if (iframe) {
        iframe.addEventListener('load', handleLoad);
        // If already loaded (e.g. srcDoc might load sync), call manually
        if (iframe.contentWindow && iframe.contentWindow.document.readyState === 'complete') {
            handleLoad();
        }
        return () => {
            iframe.removeEventListener('load', handleLoad);
        };
    }
  }, [viewMode, isTextEditModeActive, isComponentEditModeActive, activeSlideIndex, finalHtmlContent]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExportDropdownOpen &&
          exportButtonRef.current && !exportButtonRef.current.contains(event.target as Node) &&
          exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportDropdownOpen]);


  const handleCopyCode = async () => {
    if (!htmlContent) return;
    try {
      await navigator.clipboard.writeText(htmlContent);
      setCopyButtonText('コピーしました！');
      setTimeout(() => setCopyButtonText('コードをコピー'), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyButtonText('コピー失敗');
      setTimeout(() => setCopyButtonText('コードをコピー'), 2000);
    }
  };

  const handleSubmitFeedbackClick = () => {
    onSubmitFeedback(activeSlideIndex, currentFeedbackText);
  };
  
  const canSubmitFeedback = htmlContent && !finalHtmlContent.startsWith("生成エラー:") && !finalHtmlContent.startsWith("解析エラー:") && !isLoading;
  const canPerformPreviewActions = viewMode === 'preview' && htmlContent && !finalHtmlContent.startsWith("生成エラー:") && !finalHtmlContent.startsWith("解析エラー:") && !isLoading && !isTextEditModeActive && !isComponentEditModeActive;


  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportSlideAsHtml = () => {
    // If iframe is in edit mode, get its current HTML
    const iframe = iframeRef.current;
    let contentToExport = finalHtmlContent;
    if (iframe && iframe.contentWindow && (isTextEditModeActive || isComponentEditModeActive)) {
        // Ensure edits are "saved" to the iframe's DOM before getting outerHTML
        const iframeWin = iframe.contentWindow as any;
        if (typeof iframeWin._saveAndDisableAllEditsInternal === 'function') {
           // This function posts message, we just want the HTML
           // Temporarily disable postMessage or get HTML before full save
        }
        contentToExport = iframe.contentWindow.document.documentElement.outerHTML;
    }

    const blob = new Blob([contentToExport], { type: 'text/html;charset=utf-8' });
    triggerDownload(blob, `slide-${activeSlideIndex + 1}.html`);
  };

  const getSlideCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) {
      throw new Error('プレビューが見つかりません。');
    }
    // Ensure no edit mode is active visually for screenshot
    const iframeWin = iframeRef.current.contentWindow as any;
    let wasTextEdit = false, wasCompEdit = false;
    if(isTextEditModeActive && typeof iframeWin._cleanupTextEditMode === 'function') { iframeWin._cleanupTextEditMode(); wasTextEdit = true; }
    if(isComponentEditModeActive && typeof iframeWin._cleanupComponentEditMode === 'function') { iframeWin._cleanupComponentEditMode(); wasCompEdit = true; }


    const iframeDoc = iframeRef.current.contentWindow.document;
    const slideContainer = iframeDoc.querySelector('.slide-container') || iframeDoc.body;
    
    // Temporarily set fixed size for consistent capture if not already
    const originalIframeBodyStyle = iframeDoc.body.style.cssText;
    const originalSlideContainerStyle = (slideContainer as HTMLElement).style.cssText;

    // Ensure the container itself is the target size for html2canvas
    iframeDoc.body.style.width = '1280px'; // Or the slide's actual design width
    iframeDoc.body.style.height = '720px'; // Or the slide's actual design height
    (slideContainer as HTMLElement).style.width = '1280px';
    (slideContainer as HTMLElement).style.height = '720px';
    (slideContainer as HTMLElement).style.margin = '0'; // Remove external margins
    (slideContainer as HTMLElement).style.overflow = 'hidden'; // Clip content

    // Wait for styles to apply and rendering to settle
    await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay

    const canvas = await html2canvas(slideContainer as HTMLElement, {
      scale: 2, // Higher resolution
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff', // Default background
      width: 1280, // Explicit width for capture area
      height: 720, // Explicit height for capture area
      scrollX: 0,
      scrollY: 0,
      windowWidth: iframeDoc.documentElement.scrollWidth, // Use document's full width
      windowHeight: iframeDoc.documentElement.scrollHeight, // Use document's full height
    });

    // Restore original styles
    iframeDoc.body.style.cssText = originalIframeBodyStyle;
    (slideContainer as HTMLElement).style.cssText = originalSlideContainerStyle;

    // Re-apply edit modes if they were active
    if(wasTextEdit && typeof iframeWin._makeTextEditableInternal === 'function') iframeWin._makeTextEditableInternal(iframeWin, activeSlideIndex);
    if(wasCompEdit && typeof iframeWin._makeComponentsEditableInternal === 'function') iframeWin._makeComponentsEditableInternal(iframeWin, activeSlideIndex);


    return canvas;
  };

  const exportSlideAsPng = async () => {
    const canvas = await getSlideCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `slide-${activeSlideIndex + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportSlideAsPdf = async () => {
    const canvas = await getSlideCanvas();
    if (!canvas) return;
    const imgData = canvas.toDataURL('image/png');
    
    // PDF dimensions based on 16:9 aspect ratio, e.g., common presentation size
    const pdfWidth = 1280; // points (roughly pixels at 72 DPI)
    const pdfHeight = 720;

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [pdfWidth, pdfHeight], // Custom format matching canvas aspect ratio
    });
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`slide-${activeSlideIndex + 1}.pdf`);
  };

  const exportSlideAsSvg = async () => {
    const canvas = await getSlideCanvas();
    if (!canvas) return;

    const pngDataUrl = canvas.toDataURL('image/png');
    const slideWidth = 1280; // Match getSlideCanvas dimensions
    const slideHeight = 720;

    const svgString = `
      <svg width="${slideWidth}" height="${slideHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <title>Slide ${activeSlideIndex + 1}</title>
        <image xlink:href="${pngDataUrl}" x="0" y="0" width="${slideWidth}" height="${slideHeight}" />
      </svg>
    `.trim();

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownload(blob, `slide-${activeSlideIndex + 1}.svg`);
  };


  const handleExport = async (format: 'html' | 'png' | 'pdf' | 'svg') => {
    setExportError(null); 

    if (format === 'html') {
      if (!htmlContent || finalHtmlContent.startsWith("生成エラー:") || finalHtmlContent.startsWith("解析エラー:")) {
        setExportError(`エクスポート不可: HTMLコンテンツが無効です。`);
        return;
      }
    } else { // For PNG/PDF/SVG
      if (!canPerformPreviewActions && !(isTextEditModeActive || isComponentEditModeActive)) { // Allow export if in edit mode, will temp disable for capture
         setExportError(`エクスポート不可: プレビューが利用できない状態です。`);
         return;
      }
      if (!iframeRef.current?.contentWindow) {
        setExportError(`エクスポート不可: プレビューコンテンツがロードされていません。`);
        return;
      }
    }

    setIsExporting(true);
    setIsExportDropdownOpen(false); 

    try {
      switch (format) {
        case 'html':
          exportSlideAsHtml();
          break;
        case 'png':
          await exportSlideAsPng();
          break;
        case 'pdf':
          await exportSlideAsPdf();
          break;
        case 'svg':
          await exportSlideAsSvg();
          break;
      }
    } catch (err) {
      console.error(`Export error (${format}):`, err);
      const message = err instanceof Error ? err.message : String(err);
      setExportError(`エクスポート失敗 (${format}): ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenInNewTab = () => {
     if (!finalHtmlContent || finalHtmlContent.startsWith("生成エラー:") || finalHtmlContent.startsWith("解析エラー:")) {
      alert("新しいタブで開くには、有効なHTMLコンテンツが必要です。");
      return;
    }
    // If iframe is in edit mode, get its current HTML for the new tab
    const iframe = iframeRef.current;
    let contentToOpen = finalHtmlContent;

    if (iframe && iframe.contentWindow && (isTextEditModeActive || isComponentEditModeActive)) {
        // To get the most up-to-date HTML including unsaved live edits:
        contentToOpen = iframe.contentWindow.document.documentElement.outerHTML;
    }


    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(contentToOpen);
      newWindow.document.close();
    } else {
      alert("ポップアップがブロックされたか、新しいタブを開けませんでした。");
    }
  };

  if (error && !isLoading) { 
     return (
      <div className="p-6 text-red-400 text-center">
        <h3 className="text-xl font-semibold text-red-500 mb-3">エラー</h3>
        <p>{error}</p>
        {htmlContent && htmlContent.startsWith("生成エラー:") && viewMode === 'code' && (
            <pre className="mt-4 bg-slate-900 p-4 text-sm text-slate-200 whitespace-pre-wrap break-all max-h-[calc(100vh-400px)] overflow-auto custom-scrollbar" aria-label="Error details">
                {htmlContent}
            </pre>
        )}
      </div>
    );
  }

  if (isLoading && !htmlContent && !currentThought) { 
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-slate-400">
        <LoadingSpinner />
        <p className="mt-3">HTMLスライドを生成中...</p>
      </div>
    );
  }
  
  if (!htmlContent && !isLoading && !error) {
     return (
      <div className="p-6 text-slate-500 text-center">
        <p>まだHTMLスライドがありません。</p>
        <p className="text-sm mt-1">画像をアップロードして「生成開始」をクリックし、構造化データが抽出された後にHTMLが生成されます。</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xl font-semibold text-sky-400">スライド出力</h3>
        <div className="flex space-x-2 flex-wrap gap-y-2 items-center">
          <button
            onClick={() => setViewMode('code')}
            aria-pressed={viewMode === 'code'}
            className={`px-3 py-1.5 md:px-4 md:py-2 text-sm rounded-md font-medium transition-colors ${
              viewMode === 'code' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            コード
          </button>
          <button
            onClick={() => setViewMode('preview')}
            aria-pressed={viewMode === 'preview'}
            className={`px-3 py-1.5 md:px-4 md:py-2 text-sm rounded-md font-medium transition-colors ${
              viewMode === 'preview' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            プレビュー
          </button>
          
          {viewMode === 'preview' && (
             <button
                onClick={handleOpenInNewTab}
                disabled={isLoading || isExporting || (!htmlContent || finalHtmlContent.startsWith("生成エラー:") || finalHtmlContent.startsWith("解析エラー:"))}
                className={`px-3 py-1.5 md:px-4 md:py-2 text-sm rounded-md font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-500 flex items-center
                  ${(isLoading || isExporting || (!htmlContent || finalHtmlContent.startsWith("生成エラー:") || finalHtmlContent.startsWith("解析エラー:"))) ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="新しいタブでプレビューを開く"
              >
                <ExternalLinkIcon className="w-4 h-4 mr-2" />
                新しいタブで開く
              </button>
          )}

          <div className="relative">
            <button
              ref={exportButtonRef}
              onClick={() => setIsExportDropdownOpen(prev => !prev)}
              disabled={isExporting || (viewMode === 'code' && (!htmlContent || finalHtmlContent.startsWith("生成エラー:") || finalHtmlContent.startsWith("解析エラー:"))) }
              className={`px-3 py-1.5 md:px-4 md:py-2 text-sm rounded-md font-medium transition-colors bg-green-600 text-white hover:bg-green-500 flex items-center
                 ${(isExporting || (viewMode === 'code' && (!htmlContent || finalHtmlContent.startsWith("生成エラー:") || finalHtmlContent.startsWith("解析エラー:")))) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              aria-haspopup="true"
              aria-expanded={isExportDropdownOpen}
              aria-label="エクスポートオプション"
            >
              <ExportIcon className="w-4 h-4 mr-2" />
              {isExporting ? <LoadingSpinner size="xs" color="text-white" className="mr-1" /> : null}
              エクスポート
            </button>
            {isExportDropdownOpen && (
              <div
                ref={exportDropdownRef}
                role="menu"
                className="absolute right-0 mt-2 w-48 bg-slate-700 rounded-md shadow-xl z-20 py-1 border border-slate-600"
              >
                <button
                  role="menuitem"
                  onClick={() => handleExport('html')}
                  disabled={isExporting || !htmlContent || finalHtmlContent.startsWith("生成エラー:") || finalHtmlContent.startsWith("解析エラー:")}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  HTMLとして保存
                </button>
                <button
                  role="menuitem"
                  onClick={() => handleExport('png')}
                  // For PNG/PDF/SVG, allow even if edit mode is active, as getSlideCanvas handles it
                  disabled={isExporting || viewMode !== 'preview' || !iframeRef.current?.contentWindow || !htmlContent || finalHtmlContent.startsWith("生成エラー:") || finalHtmlContent.startsWith("解析エラー:")}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  PNGとして保存
                </button>
                <button
                  role="menuitem"
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting || viewMode !== 'preview' || !iframeRef.current?.contentWindow || !htmlContent || finalHtmlContent.startsWith("生成エラー:") || finalHtmlContent.startsWith("解析エラー:")}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  PDFとして保存
                </button>
                 <button
                  role="menuitem"
                  onClick={() => handleExport('svg')}
                  disabled={isExporting || viewMode !== 'preview' || !iframeRef.current?.contentWindow || !htmlContent || finalHtmlContent.startsWith("生成エラー:") || finalHtmlContent.startsWith("解析エラー:")}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SVGとして保存
                </button>
              </div>
            )}
          </div>

          {viewMode === 'code' && htmlContent && !finalHtmlContent.startsWith("生成エラー:") && !finalHtmlContent.startsWith("解析エラー:") && (
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 md:px-4 md:py-2 text-sm rounded-md font-medium transition-colors bg-emerald-600 text-white hover:bg-emerald-500 flex items-center"
              aria-label={copyButtonText}
            >
              <CopyIcon className="w-4 h-4 mr-2" />
              {copyButtonText}
            </button>
          )}
          {viewMode === 'preview' && htmlContent && !finalHtmlContent.startsWith("生成エラー:") && !finalHtmlContent.startsWith("解析エラー:") && (
            <>
              <button
                onClick={handleToggleTextEditModeClick}
                aria-pressed={isTextEditModeActive}
                disabled={isLoading || isExporting} // Removed direct check for other edit mode here, logic is in handler
                className={`px-3 py-1.5 md:px-4 md:py-2 text-sm rounded-md font-medium transition-colors flex items-center ${
                  isTextEditModeActive ? 'bg-amber-500 text-white hover:bg-amber-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                } ${(isLoading || isExporting) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isTextEditModeActive ? 'テキスト編集を終了' : 'テキスト編集モード'}
              </button>
              <button
                onClick={handleToggleComponentEditModeClick}
                aria-pressed={isComponentEditModeActive}
                disabled={isLoading || isExporting} // Removed direct check for other edit mode here
                className={`px-3 py-1.5 md:px-4 md:py-2 text-sm rounded-md font-medium transition-colors flex items-center ${
                  isComponentEditModeActive ? 'bg-purple-500 text-white hover:bg-purple-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                } ${(isLoading || isExporting) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isComponentEditModeActive ? 'コンポーネント編集を終了' : 'コンポーネント編集'}
              </button>
              <button
                onClick={() => onOpenFeedbackModal(activeSlideIndex)}
                disabled={!canSubmitFeedback || isLoading || isExporting || isTextEditModeActive || isComponentEditModeActive}
                className={`px-3 py-1.5 md:px-4 md:py-2 text-sm rounded-md font-medium transition-colors bg-teal-600 text-white hover:bg-teal-500 flex items-center ${(!canSubmitFeedback || isLoading || isExporting || isTextEditModeActive || isComponentEditModeActive) ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label="HTMLレビューと再生成"
              >
                <FeedbackIcon className="w-4 h-4 mr-2" />
                レビューと再生成
              </button>
            </>
          )}
        </div>
      </div>
      {exportError && (
        <p className="text-sm text-red-400 mb-2 p-2 bg-red-900/30 rounded-md" role="alert">
          エラー: {exportError}
        </p>
      )}
      {isLoading && currentThought && (
         <p className="text-xs text-slate-400 mt-1 mb-2 italic animate-pulse">
            Geminiの思考: {currentThought.length > 150 ? currentThought.substring(0, 147) + "..." : currentThought}
        </p>
      )}
      {isLoading && htmlContent && <p className="text-sm text-sky-400 mb-2 animate-pulse">HTMLをストリーミング中...</p>}
      
      <div className="flex-grow overflow-auto custom-scrollbar border border-slate-700 rounded-lg">
        {viewMode === 'code' ? (
          <pre className="bg-slate-900 p-4 text-sm text-slate-200 whitespace-pre-wrap h-full" aria-label="HTML code output">
            {htmlContent || "HTMLコードがここに表示されます..."}
          </pre>
        ) : (
          <div className="p-0 md:p-4 bg-slate-900 h-full flex items-center justify-center" aria-label="HTML preview area">
            <div className="w-full aspect-16/9 bg-white shadow-lg overflow-hidden rounded-md">
              {finalHtmlContent && !finalHtmlContent.startsWith("生成エラー:") && !finalHtmlContent.startsWith("解析エラー:") ? (
                 <iframe
                    ref={iframeRef}
                    // Key change strategy: use activeSlideIndex + a counter that increments when content *structurally* changes (e.g. new generation)
                    // For simple re-renders due to edit mode toggle, key shouldn't change to preserve iframe state.
                    // Using finalHtmlContent in key forces re-mount on every minor HTML update, which might be too much.
                    // Let's use activeSlideIndex as primary key component, and perhaps a timestamp of last full generation if needed.
                    key={`slide-preview-${activeSlideIndex}-${finalHtmlContent.length}`} 
                    srcDoc={finalHtmlContent}
                    title="スライドプレビュー"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-modals" // Added more sandbox permissions for potential Chart.js popups/modals if any
                  />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-100 p-4 text-center">
                  {isLoading ? "プレビューを生成中..." : (finalHtmlContent || "プレビューを生成中またはコンテンツがありません。")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isFeedbackModalOpen && (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => onCloseFeedbackModal(activeSlideIndex)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
        >
          <div 
            className="bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-lg text-slate-100"
            onClick={(e) => e.stopPropagation()} 
          >
            <h2 id="feedback-modal-title" className="text-xl font-semibold text-sky-400 mb-4">
              HTMLレビュー (スライド {activeSlideIndex + 1})
            </h2>
            <textarea
              value={currentFeedbackText}
              onChange={(e) => setCurrentFeedbackText(e.target.value)}
              placeholder="生成されたHTMLスライドに関する具体的なフィードバックを入力してください。例：「タイトルが大きすぎる」「チャートの色を変更してほしい」など。"
              className="w-full h-40 p-3 bg-slate-700 text-slate-200 border border-slate-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-slate-400"
              aria-label={`Feedback for slide ${activeSlideIndex + 1}`}
            />
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => onCloseFeedbackModal(activeSlideIndex)}
                className="px-4 py-2 text-sm rounded-md font-medium bg-slate-600 hover:bg-slate-500 text-slate-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmitFeedbackClick}
                disabled={isLoading || !currentFeedbackText.trim()}
                className="px-4 py-2 text-sm rounded-md font-medium bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (<LoadingSpinner size="xs" color="text-white" className="mr-2"/>) : null}
                フィードバックを送信して再生成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HtmlOutputTab;
