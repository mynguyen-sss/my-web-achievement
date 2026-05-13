// Supabase Configuration
const SUPABASE_URL = 'https://eztcbahjrmugvytvfxqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_veiXSNA8lZtNgG2ky4bL8Q_JdB3dUWD'; 
const APP_VERSION = '2.8';

let supabaseClient;
let currentStep = 0; // 0 is Home, 'dashboard' is Dashboard, 1-6 are form steps
const totalSteps = 6;
let appData = {
    category: '',
    projectName: '',
    realityText: '',
    goalText: '',
    realityImageFiles: [],
    goalImageFiles: [],
    solutionSteps: [],
    solutionImageFiles: [],
    roadmapPhases: [],
    resultPoints: [],
    resultImageFiles: []
};

// DOM Elements
let btnNext, btnPrev, btnSubmit, loadingOverlay, btnExport;

function initApp() {
    try {
        // Safe Supabase init
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
            console.warn("Supabase CDN not loaded. Data will not be saved to DB.");
        }
    } catch (e) {
        console.error("Failed to initialize Supabase:", e);
    }

    btnNext = document.getElementById('btn-next');
    btnPrev = document.getElementById('btn-prev');
    btnSubmit = document.getElementById('btn-submit');
    loadingOverlay = document.getElementById('loading-overlay');
    btnExport = document.getElementById('btn-export');
    const btnPPTExport = document.getElementById('btn-ppt-export');
    const btnBulkPPT = document.getElementById('btn-bulk-ppt');

    updateUI();

    if (btnNext) btnNext.addEventListener('click', handleNext);
    if (btnPrev) btnPrev.addEventListener('click', handlePrev);
    if (btnSubmit) btnSubmit.addEventListener('click', handleSubmit);
    if (btnExport) btnExport.addEventListener('click', handleExport);
    if (btnPPTExport) btnPPTExport.addEventListener('click', handlePPTExport);
    if (btnBulkPPT) btnBulkPPT.addEventListener('click', handleBulkPPTExport);

    // Navigation Buttons
    document.getElementById('btn-home-new')?.addEventListener('click', () => {
        resetForm();
        currentStep = 'category';
        updateUI();
    });
    
    document.getElementById('btn-home-dashboard')?.addEventListener('click', () => {
        currentStep = 'dashboard';
        updateUI();
    });

    document.getElementById('btn-dash-back')?.addEventListener('click', () => {
        currentStep = 0;
        updateUI();
    });

    document.getElementById('btn-cat-back')?.addEventListener('click', () => {
        currentStep = 0;
        updateUI();
    });

    // Category Card Selection
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            appData.category = card.getAttribute('data-cat');
            currentStep = 1;
            updateUI();
        });
    });

    document.getElementById('btn-go-home')?.addEventListener('click', () => {
        currentStep = 0;
        updateUI();
    });

    document.getElementById('btn-new-project')?.addEventListener('click', () => {
        resetForm();
        currentStep = 'category';
        updateUI();
    });

    // Dynamic input buttons
    const btnAddSolution = document.getElementById('btn-add-solution');
    if (btnAddSolution) btnAddSolution.addEventListener('click', addSolutionStep);
    
    const btnAddRoadmap = document.getElementById('btn-add-roadmap');
    if (btnAddRoadmap) btnAddRoadmap.addEventListener('click', addRoadmapPhase);
    
    const btnAddResult = document.getElementById('btn-add-result');
    if (btnAddResult) btnAddResult.addEventListener('click', addResultPoint);

    // Image previews
    setupImagePreview('reality-image', 'reality-image-preview', 'realityImageFiles');
    setupImagePreview('goal-image', 'goal-image-preview', 'goalImageFiles');
    setupImagePreview('solution-image', 'solution-image-preview', 'solutionImageFiles');
    setupImagePreview('result-image', 'result-image-preview', 'resultImageFiles');

    updateUI();
}

// Ensure initApp runs
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function updateUI() {
    try {
        // Hide all steps
        document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active-step'));
        
        const indicator = document.getElementById('step-indicator-container');
        const footer = document.getElementById('app-footer');

        // Show current step
        const currentStepEl = document.getElementById(`step-${currentStep}`);
        if (currentStepEl) {
            currentStepEl.classList.add('active-step');
        }

        // Manage Header, Footer, and Indicator visibility
        if (currentStep === 0 || currentStep === 'dashboard' || currentStep === 'category') {
            if (indicator) indicator.classList.add('hidden');
            if (footer) footer.classList.add('hidden');
            if (currentStep === 'dashboard') fetchProjects();
            return;
        }

        // Steps 1-6: Form flow
        if (currentStep >= 1 && currentStep <= 6) {
            if (indicator) indicator.classList.remove('hidden');
            if (currentStep === 6) {
                if (footer) footer.classList.add('hidden'); // Hide footer on result page
            } else {
                if (footer) footer.classList.remove('hidden');
            }

            // Update indicator dots
            document.querySelectorAll('.step-indicator .step').forEach((el, index) => {
                el.classList.remove('active', 'completed');
                if (index + 1 < currentStep) el.classList.add('completed');
                if (index + 1 === currentStep) el.classList.add('active');
            });

            // Button visibility
            if (btnPrev) btnPrev.classList.toggle('hidden', currentStep === 1);
            if (btnNext) btnNext.classList.toggle('hidden', currentStep >= totalSteps - 1);
            if (btnSubmit) btnSubmit.classList.toggle('hidden', currentStep < totalSteps - 1);
        }
    } catch (e) {
        console.error("Error in updateUI:", e);
    }
}

function handleNext() {
    try {
        // Basic validation before moving next
        if (currentStep === 1) {
            const titleInput = document.getElementById('project-name');
            const title = titleInput ? titleInput.value.trim() : '';
            if (!title) {
                alert("Vui lòng nhập tên dự án!");
                return;
            }
            appData.projectName = title;
        }
        
        if (currentStep < totalSteps - 1) {
            currentStep++;
            updateUI();
        }
    } catch (e) {
        console.error("Error in handleNext:", e);
        alert("Lỗi khi chuyển bước: " + e.message);
    }
}

function handlePrev() {
    if (currentStep > 1) {
        currentStep--;
        updateUI();
    }
}

function setupImagePreview(inputId, previewId, dataKey) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;
    
    const renderPreviews = () => {
        preview.innerHTML = '';
        appData[dataKey].forEach((file, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'preview-item';
            
            const img = document.createElement('img');
            const reader = new FileReader();
            reader.onload = (e) => img.src = e.target.result;
            reader.readAsDataURL(file);
            
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '&times;';
            delBtn.className = 'btn-delete-img';
            delBtn.type = 'button';
            delBtn.onclick = (e) => {
                e.preventDefault();
                appData[dataKey].splice(index, 1);
                renderPreviews();
            };
            
            wrapper.appendChild(img);
            wrapper.appendChild(delBtn);
            preview.appendChild(wrapper);
        });
    };

    input.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        // Add to existing files
        appData[dataKey] = [...appData[dataKey], ...files];
        renderPreviews();
        input.value = ''; // Reset input to allow selecting same file again or adding more
    });
}

function addSolutionStep() {
    const container = document.getElementById('solution-steps-container');
    const count = container.querySelectorAll('.solution-step').length + 1;
    const html = `
        <div class="solution-step input-group">
            <label>Bước ${count}</label>
            <div style="display: flex; gap: 8px;">
                <input type="text" class="solution-input" placeholder="Nhập tên bước..." style="flex: 1;">
                <button type="button" class="btn btn-danger btn-sm" onclick="deleteRow(this)">X</button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function addRoadmapPhase() {
    const container = document.getElementById('roadmap-phases-container');
    const count = container.querySelectorAll('.roadmap-phase').length + 1;
    const html = `
        <div class="roadmap-phase card-input">
            <div style="display: flex; gap: 8px; justify-content: space-between;">
                <input type="text" class="roadmap-name" placeholder="Tên giai đoạn (VD: Phase ${count})" value="Phase ${count}" style="flex: 1;">
                <button type="button" class="btn btn-danger btn-sm" onclick="deleteRow(this)">Xóa</button>
            </div>
            <textarea class="roadmap-desc" rows="2" placeholder="Mô tả công việc..."></textarea>
            <input type="text" class="roadmap-date" placeholder="Thời gian (VD: 02/2025)">
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function addResultPoint() {
    const container = document.getElementById('result-points-container');
    const html = `
        <div class="input-group mt-2">
            <div style="display: flex; gap: 8px;">
                <input type="text" class="result-input" placeholder="Kết quả đạt được..." style="flex: 1;">
                <button type="button" class="btn btn-danger btn-sm" onclick="deleteRow(this)">X</button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function deleteRow(btn) {
    const row = btn.closest('.solution-step') || btn.closest('.roadmap-phase') || btn.closest('.input-group');
    if (row) row.remove();
}

function gatherData() {
    appData.realityText = document.getElementById('reality-text').value.trim();
    appData.goalText = document.getElementById('goal-text').value.trim();
    appData.solutionSteps = Array.from(document.querySelectorAll('.solution-input'))
                                 .map(input => input.value.trim())
                                 .filter(v => v);
    appData.roadmapPhases = Array.from(document.querySelectorAll('.roadmap-phase')).map(el => {
        return {
            name: el.querySelector('.roadmap-name').value.trim(),
            desc: el.querySelector('.roadmap-desc').value.trim(),
            date: el.querySelector('.roadmap-date').value.trim()
        };
    }).filter(p => p.name || p.desc);
    appData.resultPoints = Array.from(document.querySelectorAll('.result-input'))
                                .map(input => input.value.trim())
                                .filter(v => v);
}

async function uploadImage(file) {
    if (!file || !supabaseClient) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    
    try {
        const { data, error } = await supabaseClient.storage
            .from('achievement_images')
            .upload(fileName, file);
        
        if (error) {
            console.error("Upload error:", error);
            return null;
        }
        
        const { data: publicData } = supabaseClient.storage
            .from('achievement_images')
            .getPublicUrl(fileName);
            
        return publicData.publicUrl;
    } catch (e) {
        console.error("Exception uploading image:", e);
        return null;
    }
}

async function handleSubmit() {
    gatherData();
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

    try {
        const uploadMultiple = async (files) => {
            if (!files || files.length === 0) return [];
            const urls = [];
            for (const file of files) {
                const url = await uploadImage(file);
                if (url) urls.push(url);
            }
            return urls;
        };

        let realityImgUrls = [];
        let goalImgUrls = [];
        let solutionImgUrls = [];
        let resultImgUrls = [];

        if (supabaseClient) {
            realityImgUrls = await uploadMultiple(appData.realityImageFiles);
            goalImgUrls = await uploadMultiple(appData.goalImageFiles);
            solutionImgUrls = await uploadMultiple(appData.solutionImageFiles);
            resultImgUrls = await uploadMultiple(appData.resultImageFiles);

            const solutionTxt = appData.solutionSteps.map((s, i) => `${i+1}. ${s}`).join('\n');
            const roadmapTxt = JSON.stringify(appData.roadmapPhases);
            const resultTxt = appData.resultPoints.map(p => `- ${p}`).join('\n');

            const { error } = await supabaseClient
                .from('achievements')
                .insert([{
                    category: appData.category,
                    project_name: appData.projectName,
                    reality_text: appData.realityText,
                    goal_text: appData.goalText,
                    reality_image_url: realityImgUrls,
                    goal_image_url: goalImgUrls,
                    solution_steps: solutionTxt,
                    solution_image_url: solutionImgUrls,
                    roadmap_phases: roadmapTxt,
                    result_points: resultTxt,
                    result_image_url: resultImgUrls
                }]);

            if (error) {
                console.error("DB Insert Error:", error);
                alert("Lỗi lưu DB: " + error.message);
            }
        }

        buildExportCanvas(realityImgUrls, goalImgUrls, solutionImgUrls, resultImgUrls, true);
        currentStep++;
        updateUI();
        setTimeout(autoFitText, 100);
    } catch (e) {
        alert("Có lỗi: " + e.message);
    } finally {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }
}

async function viewProjectDetails(id) {
    loadingOverlay.classList.remove('hidden');
    try {
        const { data, error } = await supabaseClient.from('achievements').select('*').eq('id', id).single();
        if (error) throw error;

        appData.projectName = data.project_name;
        appData.realityText = data.reality_text;
        appData.goalText = data.goal_text;
        appData.solutionSteps = data.solution_steps ? data.solution_steps.split('\n').map(s => s.replace(/^\d+\.\s*/, '')) : [];
        try {
            appData.roadmapPhases = JSON.parse(data.roadmap_phases);
        } catch (e) {
            appData.roadmapPhases = [{name: 'Kế hoạch', desc: data.roadmap_phases, date: ''}];
        }
        appData.resultPoints = data.result_points ? data.result_points.split('\n').map(s => s.replace(/^- /, '')) : [];

        buildExportCanvas(data.reality_image_url || [], data.goal_image_url || [], data.solution_image_url || [], data.result_image_url || [], true);
        
        currentStep = 6;
        updateUI();
        setTimeout(autoFitText, 100);
    } catch (e) {
        alert("Lỗi: " + e.message);
    } finally {
        loadingOverlay.classList.add('hidden');
    }
}

function resetForm() {
    appData = {
        category: '',
        projectName: '',
        realityText: '',
        goalText: '',
        realityImageFiles: [],
        solutionSteps: [],
        solutionImageFiles: [],
        roadmapPhases: [],
        resultPoints: [],
        resultImageFiles: []
    };
    
    document.getElementById('project-name').value = '';
    document.getElementById('reality-text').value = '';
    document.getElementById('goal-text').value = '';
    document.getElementById('reality-image').value = '';
    document.getElementById('reality-image-preview').innerHTML = '';
    document.getElementById('solution-image').value = '';
    document.getElementById('solution-image-preview').innerHTML = '';
    document.getElementById('result-image').value = '';
    document.getElementById('result-image-preview').innerHTML = '';

    document.getElementById('solution-steps-container').innerHTML = `
        <div class="solution-step input-group">
            <label>Bước 1</label>
            <div style="display: flex; gap: 8px;">
                <input type="text" class="solution-input" placeholder="Ví dụ: Define architecture..." style="flex: 1;">
            </div>
        </div>
    `;
    document.getElementById('roadmap-phases-container').innerHTML = `
        <div class="roadmap-phase card-input">
            <div style="display: flex; gap: 8px; justify-content: space-between;">
                <input type="text" class="roadmap-name" placeholder="Phase 1" value="Phase 1" style="flex: 1;">
            </div>
            <textarea class="roadmap-desc" rows="2"></textarea>
            <input type="text" class="roadmap-date">
        </div>
    `;
    document.getElementById('result-points-container').innerHTML = `
        <div class="input-group">
            <div style="display: flex; gap: 8px;">
                <input type="text" class="result-input" placeholder="..." style="flex: 1;">
            </div>
        </div>
    `;
}

function autoFitText() {
    const boxContents = document.querySelectorAll('.box-content');
    boxContents.forEach(content => {
        // Skip roadmap box as requested
        if (content.closest('.bg-roadmap')) return;

        const inner = content.querySelector('.box-inner');
        if (!inner) return;
        
        // Reset state
        inner.style.transform = 'scale(1)';
        inner.style.width = '100%';

        const contentHeight = content.clientHeight;
        const innerHeight = inner.scrollHeight;
        
        if (innerHeight > contentHeight && contentHeight > 0) {
            // Calculate ratio to fit height
            const ratio = (contentHeight / innerHeight) * 0.98;
            inner.style.transform = `scale(${ratio})`;
            
            // CRITICAL: Compensate width so it still fills the box horizontally
            // If we scale down by 0.8, we must set width to 1/0.8 = 125% 
            // so the visual result is 100% width.
            inner.style.width = (100 / ratio) + '%';
        }
    });
}

async function fetchProjects() {
    const loading = document.getElementById('dashboard-loading');
    const list = document.getElementById('dashboard-list');
    loading.style.display = 'block';
    list.style.display = 'none';
    try {
        const { data, error } = await supabaseClient.from('achievements').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        renderProjects(data);
    } catch (e) {
        alert("Lỗi: " + e.message);
    } finally {
        loading.style.display = 'none';
        list.style.display = 'grid';
    }
}

function renderProjects(projects) {
    const container = document.getElementById('dashboard-list');
    const bulkBtn = document.getElementById('btn-bulk-ppt');
    if (!projects || projects.length === 0) {
        container.innerHTML = '<p class="text-center">Chưa có dự án nào.</p>';
        if (bulkBtn) bulkBtn.style.display = 'none';
        return;
    }
    const categories = ["Saving cost", "Process improvement", "People improvement", "Problem improvement", "Product improvement", "Other improvement"];
    const grouped = {};
    categories.forEach(c => grouped[c] = []);
    grouped["Uncategorized"] = [];
    projects.forEach(p => {
        const cat = p.category || "Uncategorized";
        if (grouped[cat]) grouped[cat].push(p);
        else grouped["Uncategorized"].push(p);
    });
    let html = '';
    for (const cat in grouped) {
        const items = grouped[cat];
        if (items.length === 0) continue;
        html += `<div class="category-group" data-category="${cat}"><div class="category-group-header"><h3><input type="checkbox" class="checkbox-custom cat-checkbox" onchange="toggleCategorySelection(this, '${cat}')"> ${cat} (${items.length})</h3></div><div class="category-projects" style="display: none;">`;
        items.forEach(p => {
            html += `<div class="dashboard-item"><input type="checkbox" class="checkbox-custom project-checkbox" data-id="${p.id}" data-category="${cat}" onchange="updateBulkBtnVisibility()"><label onclick="viewProjectDetails('${p.id}')">${p.project_name}</label><span class="date">${new Date(p.created_at).toLocaleDateString('vi-VN')}</span></div>`;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

window.toggleCategorySelection = function(masterCheckbox, categoryName) {
    const group = document.querySelector(`.category-group[data-category="${categoryName}"]`);
    const projectList = group.querySelector('.category-projects');
    if (projectList) {
        projectList.style.display = masterCheckbox.checked ? 'block' : 'none';
    }
    const checkboxes = group.querySelectorAll('.project-checkbox');
    checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
    updateBulkBtnVisibility();
};

window.updateBulkBtnVisibility = function() {
    const selected = document.querySelectorAll('.project-checkbox:checked').length;
    const bulkBtn = document.getElementById('btn-bulk-ppt');
    if (bulkBtn) {
        bulkBtn.style.display = selected > 0 ? 'block' : 'none';
        bulkBtn.innerText = `📊 Xuất PPT cho ${selected} dự án`;
    }
};

function buildExportCanvas(realityImgs, goalImgs, solutionImgs, resultImgs, isFromUrl = false) {
    document.getElementById('export-title').innerText = `PROJECT ${appData.projectName}`;
    document.getElementById('export-reality-text').innerText = appData.realityText;
    document.getElementById('export-goal-text').innerText = appData.goalText;
    
    const renderImgs = (containerId, imgs, fallbackKey) => {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        const sourceImgs = imgs || (fallbackKey ? appData[fallbackKey] : []);
        const imgArray = Array.isArray(sourceImgs) ? sourceImgs : [sourceImgs];
        
        imgArray.forEach(img => {
            if (!img) return;
            const el = document.createElement('img');
            if (isFromUrl && typeof img === 'string') {
                el.src = img;
                el.crossOrigin = 'anonymous';
            } else if (img instanceof File) {
                el.src = URL.createObjectURL(img);
            } else if (typeof img === 'string') {
                el.src = img;
            }
            container.appendChild(el);
        });
    };

    renderImgs('export-reality-img-container', isFromUrl ? realityImgs : null, 'realityImageFiles');
    // We need to ensure index.html has a container for goal images in export-canvas
    renderImgs('export-goal-img-container', isFromUrl ? goalImgs : null, 'goalImageFiles');
    renderImgs('export-solution-img-container', isFromUrl ? solutionImgs : null, 'solutionImageFiles');
    renderImgs('export-result-img-container', isFromUrl ? resultImgs : null, 'resultImageFiles');

    document.getElementById('export-solution-steps').innerHTML = appData.solutionSteps.map(step => `<div class="solution-step-item">${step}</div>`).join('');

    const roadmapContainer = document.getElementById('export-roadmap-container');
    let tableHtml = '<table class="roadmap-table"><thead><tr><th>#</th><th>Action</th><th>PIC</th><th>Deadline</th></tr></thead><tbody>';
    appData.roadmapPhases.forEach((phase, i) => {
        tableHtml += `<tr><td>${i+1}</td><td>${phase.desc || phase.name}</td><td></td><td>${phase.date}</td></tr>`;
    });
    tableHtml += '</tbody></table>';
    roadmapContainer.innerHTML = tableHtml;

    document.getElementById('export-result-list').innerHTML = appData.resultPoints.map(p => `<li>${p}</li>`).join('');
}

function handleExport() {
    const canvasEl = document.getElementById('export-canvas');
    const exportBtn = document.getElementById('btn-export');
    exportBtn.innerText = "Đang tạo ảnh...";
    
    html2canvas(canvasEl, { scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Achievement_${appData.projectName.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        exportBtn.innerText = "⬇ Tải Ảnh Xuống";
    }).catch(err => {
        console.error(err);
        alert("Lỗi khi tạo ảnh!");
        exportBtn.innerText = "⬇ Tải Ảnh Xuống";
    });
}

// --- PPT Export Logic ---

async function addProjectSlide(pptx, project) {
    const slide = pptx.addSlide();
    const COLOR_BG = 'B3E5FC', COLOR_TITLE_BG = '81D4FA', COLOR_TEXT = '003366', COLOR_HIGHLIGHT = 'FFFF00', COLOR_ORANGE_BORDER = 'FF9800', COLOR_SOLUTION_BOX = 'FF6D00', FONT = 'Arial';

    slide.addText(project.projectName.toUpperCase(), { x: 0.2, y: 0.2, w: 9.6, h: 0.5, fontSize: 24, bold: true, color: COLOR_TEXT, fontFace: FONT, align: 'left' });

    const boxes = [
        { id: 'reality', title: 'REALITY-GOAL', x: 0.1, y: 0.8, w: 4.8, h: 2.3 },
        { id: 'solution', title: 'SOLUTION', x: 5.1, y: 0.8, w: 4.8, h: 2.3 },
        { id: 'roadmap', title: 'ROADMAP-ACTIONS', x: 0.1, y: 3.2, w: 4.8, h: 2.3 },
        { id: 'result', title: 'RESULT', x: 5.1, y: 3.2, w: 4.8, h: 2.3 }
    ];

    boxes.forEach(box => {
        slide.addShape(pptx.ShapeType.rect, { x: box.x, y: box.y, w: box.w, h: box.h, fill: { color: COLOR_BG }, line: (box.id === 'result') ? { color: COLOR_ORANGE_BORDER, width: 1 } : { color: 'FFFFFF', width: 1 } });
        slide.addText(box.title, { x: box.x, y: box.y, w: box.w, h: 0.4, fill: { color: COLOR_TITLE_BG }, color: COLOR_TEXT, bold: true, fontSize: 18, align: 'center', fontFace: FONT });
    });

    const hasRealityImgs = project.realityImageFiles && project.realityImageFiles.length > 0;
    const hasGoalImgs = project.goalImageFiles && project.goalImageFiles.length > 0;
    const hasSolutionImgs = project.solutionImageFiles && project.solutionImageFiles.length > 0;
    const hasResultImgs = project.resultImageFiles && project.resultImageFiles.length > 0;

    slide.addText('Reality:', { x: 0.25, y: 1.3, w: 0.9, h: 0.25, fill: { color: COLOR_HIGHLIGHT }, fontSize: 13, bold: true, color: '000000', fontFace: FONT });
    slide.addText(project.realityText, { x: 0.25, y: 1.55, w: (hasRealityImgs || hasGoalImgs) ? 2.7 : 4.5, h: 0.65, fontSize: 10, color: COLOR_TEXT, fontFace: FONT, valign: 'top', shrinkText: true });
    slide.addText('Goal:', { x: 0.25, y: 2.25, w: 0.7, h: 0.25, fill: { color: COLOR_HIGHLIGHT }, fontSize: 13, bold: true, color: '000000', fontFace: FONT });
    slide.addText(project.goalText, { x: 0.25, y: 2.5, w: (hasRealityImgs || hasGoalImgs) ? 2.7 : 4.5, h: 0.55, fontSize: 10, color: COLOR_TEXT, fontFace: FONT, valign: 'top', shrinkText: true });

    const addImgsToArea = async (sources, startX, startY, maxW, maxH) => {
        if (!sources || sources.length === 0) return;
        const imgArray = Array.isArray(sources) ? sources : [sources];
        const count = imgArray.length;
        const cols = count > 1 ? 2 : 1;
        const rows = Math.ceil(count / cols);
        const w = maxW / cols;
        const h = maxH / rows;

        for (let i = 0; i < count; i++) {
            const src = imgArray[i];
            if (!src) continue; 

            const r = Math.floor(i / cols);
            const c = i % cols;
            const opts = { x: startX + (c * w), y: startY + (r * h), w: w * 0.95, h: h * 0.95, sizing: { type: 'contain' } };
            
            if (typeof src === 'string') {
                slide.addImage({ path: src, ...opts });
            } else if (src instanceof Blob || src instanceof File) {
                const dataUrl = await new Promise(res => {
                    const rd = new FileReader();
                    rd.onload = e => res(e.target.result);
                    rd.readAsDataURL(src);
                });
                slide.addImage({ data: dataUrl, ...opts });
            }
        }
    };

    await addImgsToArea(project.realityImageFiles, 3.0, 1.3, 1.8, 0.8);
    await addImgsToArea(project.goalImageFiles, 3.0, 2.2, 1.8, 0.8);
    await addImgsToArea(project.solutionImageFiles, 5.2, 2.0, 4.6, 1.0);
    await addImgsToArea(project.resultImageFiles, 7.2, 3.8, 2.5, 1.5);

    let solX = 5.2;
    project.solutionSteps.slice(0, 3).forEach((step) => {
        slide.addText(step, { 
            x: solX, y: 1.2, w: 1.5, h: 0.7, 
            fill: { color: COLOR_SOLUTION_BOX }, 
            color: 'FFFFFF', bold: true, fontSize: 8, 
            align: 'center', fontFace: FONT, valign: 'middle', 
            shrinkText: true 
        });
        solX += 1.6;
    });

    const tableRows = [[
        { text: 'STT', options: { bold: true, align: 'center', fill: 'FFFFFF' } },
        { text: 'Action', options: { bold: true, align: 'center', fill: 'FFFFFF' } },
        { text: 'Section', options: { bold: true, align: 'center', fill: 'FFFFFF' } },
        { text: 'PIC', options: { bold: true, align: 'center', fill: 'FFFFFF' } },
        { text: 'Deadline', options: { bold: true, align: 'center', fill: 'FFFFFF' } },
        { text: 'Status', options: { bold: true, align: 'center', fill: 'FFFFFF' } }
    ]];
    project.roadmapPhases.forEach((phase, i) => {
        tableRows.push([
            { text: (i + 1).toString(), options: { align: 'center' } },
            { text: phase.desc || phase.name, options: { align: 'left' } },
            { text: '', options: { align: 'center' } },
            { text: '', options: { align: 'center' } },
            { text: phase.date, options: { align: 'center' } },
            { text: '', options: { align: 'center' } }
        ]);
    });

    slide.addTable(tableRows, { x: 0.15, y: 3.65, w: 4.7, colW: [0.35, 2.0, 0.5, 0.5, 0.8, 0.55], fontSize: 7, border: { pt: 0.5, color: COLOR_ORANGE_BORDER }, valign: 'top' });

    const resTxt = project.resultPoints.map(p => `• ${p}`).join('\n');
    slide.addText(resTxt, { x: 5.25, y: 3.75, w: hasResultImgs ? 2.0 : 4.5, h: 1.6, fontSize: 10, color: COLOR_TEXT, fontFace: FONT, valign: 'top', shrinkText: true });
}

async function handlePPTExport() {
    const pptBtn = document.getElementById('btn-ppt-export');
    if (typeof PptxGenJS === 'undefined') return alert("Thư viện PowerPoint chưa được tải.");
    pptBtn.innerText = "Đang tạo PPT...";
    try {
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';
        await addProjectSlide(pptx, appData);
        await pptx.writeFile({ fileName: `Achievement_${appData.projectName.replace(/\s+/g, '_')}.pptx` });
    } catch (e) { alert("Lỗi xuất PPT: " + e.message); }
    finally { pptBtn.innerText = "📊 Tải PowerPoint (.pptx)"; }
}

async function handleBulkPPTExport() {
    const bulkBtn = document.getElementById('btn-bulk-ppt');
    const checkboxes = document.querySelectorAll('.project-checkbox:checked');
    const ids = Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
    if (ids.length === 0) return;
    bulkBtn.innerText = "Đang xử lý...";
    bulkBtn.disabled = true;
    try {
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';
        for (const id of ids) {
            const { data, error } = await supabaseClient.from('achievements').select('*').eq('id', id).single();
            if (error) throw error;
            const tempProject = {
                projectName: data.project_name,
                realityText: data.reality_text,
                goalText: data.goal_text,
                realityImageFiles: data.reality_image_url || [],
                solutionSteps: data.solution_steps ? data.solution_steps.split('\n').map(s => s.replace(/^\d+\.\s*/, '')) : [],
                solutionImageFiles: data.solution_image_url || [],
                roadmapPhases: [],
                resultPoints: data.result_points ? data.result_points.split('\n').map(s => s.replace(/^- /, '')) : [],
                resultImageFiles: data.result_image_url || []
            };
            try { tempProject.roadmapPhases = JSON.parse(data.roadmap_phases); } 
            catch (e) { tempProject.roadmapPhases = [{name: 'Kế hoạch', desc: data.roadmap_phases, date: ''}]; }
            await addProjectSlide(pptx, tempProject);
        }
        await pptx.writeFile({ fileName: `Bulk_Achievements_${Date.now()}.pptx` });
    } catch (e) { alert("Lỗi: " + e.message); }
    finally { bulkBtn.disabled = false; updateBulkBtnVisibility(); }
}
