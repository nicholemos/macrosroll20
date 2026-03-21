let selectorButtons = [];
let macroLog = [];

function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => {
        t.classList.remove('active');
        t.style.display = 'none';
    });
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.style.display = 'block';
    }
    const btn = document.getElementById('btn-tab-' + tabId);
    if (btn) btn.classList.add('active');

    localStorage.setItem('forge_lastTab', tabId);
    updateAll();
}

function sanitize(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, '');
}

function getSelectedAttributes() {
    const name = document.getElementById('charName').value || "Nome";
    const checkboxes = document.querySelectorAll('.attr-mod:checked');
    const selected = Array.from(checkboxes).map(cb => `@{${name}|${cb.value}}`);
    return selected.length > 0 ? selected.join('+') : "0";
}

function updateAll() {
    const name = document.getElementById('charName').value || "Nome";
    const margin = document.getElementById('critMargin').value || "20";
    document.getElementById('pre-header').innerText = name;

    let db = "1d20";
    if (document.getElementById('rollVantagem').checked) db = "2d20kh1";
    if (document.getElementById('rollDesvantagem').checked) db = "2d20kl1";

    // --- GERAR PERÍCIA ---
    const sName = document.getElementById('skillName').value || "Perícia";
    const c1 = document.getElementById('checkCrit').checked ? `[ ](${document.getElementById('urlCrit').value})` : "";
    const n1 = document.getElementById('checkNormal').checked ? `[ ](${document.getElementById('urlNormal').value})` : "";
    const f1 = document.getElementById('checkFail').checked ? `[ ](${document.getElementById('urlFail').value})` : "";

    document.getElementById('output').value = `&{template:custom}{{name=@{${name}|character_name}}}{{secondname= *${sName}* }}{{rollname=${sName}}}{{theroll=[[${db}cs>${margin}+[[@{${name}|${sanitize(sName)}total}]]]]}} {{criticalname=}}{{ifcritical=${c1}}}{{notcritical=${n1}}}{{ifcriticalerror=${f1}}}`;

    // --- GERAR COMBATE ---
    const w = document.getElementById('atkWeapon').value || "Arma";
    const dd = document.getElementById('atkDmgDice').value || "1d6";
    const extra = document.getElementById('atkExtraDmg').value || "0";
    const mult = parseInt(document.getElementById('atkCritMult').value) || 2;
    const attrString = getSelectedAttributes();

    // CORREÇÃO: Verifica checkboxes de combate
    const gAtkCrit = document.getElementById('checkAtkCrit').checked ? `[ ](${document.getElementById('urlAtkCrit').value})` : "";
    const gAtkNorm = document.getElementById('checkAtkNorm').checked ? `[ ](${document.getElementById('urlAtkNorm').value})` : "";
    const gAtkFail = document.getElementById('checkAtkFail').checked ? `[ ](${document.getElementById('urlAtkFail').value})` : "";

    let cDmgParts = [];
    for (let i = 0; i < mult; i++) { cDmgParts.push(dd); }
    const cDmg = cDmgParts.join(' + ') + ` + ${attrString} + ${extra}`;

    document.getElementById('outputCombate').value = `&{template:custom}{{name=@{${name}|character_name}}}{{secondname= *${w}* }}{{rollname=Rolagem }}{{theroll=[[${db}cs>${margin}+[[@{${name}|lutatotal}+@{${name}|condicaomodataque}+@{${name}|condicaomodataque}]]+@{${name}|ataquetemp}]]}} {{criticalname=Dano}}{{ifcritical=[[${cDmg}]] **CRITICO** \n${gAtkCrit}}}{{notcritical=[[${dd}+${attrString}+${extra}+@{${name}|danotemp}+@{${name}|rolltemp}]] ${gAtkNorm}}}{{ifcriticalerror=${gAtkFail}}}`;

    // --- GERAR SELETOR (Template T20-INFO com CD) ---
    const st = document.getElementById('queryTitle').value || "Opções";
    const scd = document.getElementById('querySelectorCD').value;
    const cdStr = scd ? `{{CD=${scd}}}` : "";

    const checkSel = document.getElementById('checkSelectorGif').checked;
    const sg = (checkSel && document.getElementById('urlSelectorGif').value) ? `\n[ ](${document.getElementById('urlSelectorGif').value})` : "";

    const queryButtons = selectorButtons.map(b => `${b.label}, [${b.label}](${b.macro})`).join('|\n');
    document.getElementById('outputSelector').value = `&{template:t20-info}{{infoname=${st}}}${cdStr}{{description=?{${st}|\n${queryButtons}\n}${sg}}}`;

    // Update Preview
    const container = document.getElementById('pre-gif-container');
    if (document.getElementById('pericia').classList.contains('active')) {
        document.getElementById('pre-skill').innerText = sName;
        container.innerHTML = (document.getElementById('checkNormal').checked && document.getElementById('urlNormal').value) ? `<img src="${document.getElementById('urlNormal').value}">` : "";
    } else if (document.getElementById('combate').classList.contains('active')) {
        document.getElementById('pre-skill').innerText = w;
        container.innerHTML = (document.getElementById('checkAtkNorm').checked && document.getElementById('urlAtkNorm').value) ? `<img src="${document.getElementById('urlAtkNorm').value}">` : "";
    } else {
        document.getElementById('pre-skill').innerText = st;
        container.innerHTML = (checkSel && document.getElementById('urlSelectorGif').value) ? `<img src="${document.getElementById('urlSelectorGif').value}">` : "";
    }

    saveData();
}

function copyAndLog(id, type) {
    const text = document.getElementById(id).value;
    const label = (type === 'Combate') ? document.getElementById('atkWeapon').value : (type === 'Perícia' ? document.getElementById('skillName').value : document.getElementById('queryTitle').value);

    // Copy
    navigator.clipboard.writeText(text);

    // Log
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    macroLog.unshift({ label: `${type}: ${label}`, code: text, time: timestamp });
    if (macroLog.length > 5) macroLog.pop();

    renderLog();

    const btn = event.currentTarget;
    btn.innerText = "COPIADO E SALVO!";
    setTimeout(() => btn.innerText = "Copiar e Salvar no Log", 2000);
}

function renderLog() {
    const container = document.getElementById('macroLog');
    if (macroLog.length === 0) return;
    container.innerHTML = macroLog.map((item, index) => `
        <div class="log-item">
            <span><strong>[${item.time}]</strong> ${item.label}</span>
            <button class="btn-log-copy" onclick="copyFromLog(${index})">Copiar</button>
        </div>
    `).join('');
    localStorage.setItem('forge_log', JSON.stringify(macroLog));
}

function copyFromLog(index) {
    navigator.clipboard.writeText(macroLog[index].code);
    alert("Macro recuperada do log!");
}

function addButton() {
    const l = document.getElementById('btnLabel').value.trim();
    if (l) { selectorButtons.push({ label: l, macro: `!&#13;#${l}` }); document.getElementById('btnLabel').value = ''; renderButtons(); updateAll(); }
}

function renderButtons() {
    const c = document.getElementById('buttonContainer'); c.innerHTML = '';
    selectorButtons.forEach((b, i) => {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.innerHTML = `${b.label}<span class="remove" onclick="removeButton(${i})">×</span>`;
        c.appendChild(tag);
    });
}

function removeButton(i) { selectorButtons.splice(i, 1); renderButtons(); updateAll(); }
function handleEnter(e) { if (e.key === 'Enter') addButton(); }

function saveData() {
    const attrStates = {};
    document.querySelectorAll('.attr-mod').forEach(cb => attrStates[cb.value] = cb.checked);
    const d = {
        n: document.getElementById('charName').value,
        m: document.getElementById('critMargin').value,
        sn: document.getElementById('skillName').value,
        uc: document.getElementById('urlCrit').value,
        un: document.getElementById('urlNormal').value,
        uf: document.getElementById('urlFail').value,
        cc: document.getElementById('checkCrit').checked,
        cn: document.getElementById('checkNormal').checked,
        cf: document.getElementById('checkFail').checked,
        dm: document.querySelector('input[name="diceMod"]:checked').id,
        aw: document.getElementById('atkWeapon').value,
        ad: document.getElementById('atkDmgDice').value,
        ax: document.getElementById('atkExtraDmg').value,
        am: document.getElementById('atkCritMult').value,
        uac: document.getElementById('urlAtkCrit').value,
        uan: document.getElementById('urlAtkNorm').value,
        uaf: document.getElementById('urlAtkFail').value,
        cac: document.getElementById('checkAtkCrit').checked,
        can: document.getElementById('checkAtkNorm').checked,
        caf: document.getElementById('checkAtkFail').checked,
        qt: document.getElementById('queryTitle').value,
        qcd: document.getElementById('querySelectorCD').value, // Novo
        usg: document.getElementById('urlSelectorGif').value,
        csg: document.getElementById('checkSelectorGif').checked, // Novo
        sb: selectorButtons,
        attrs: attrStates
    };
    localStorage.setItem('forge_vFinal', JSON.stringify(d));
}

window.onload = () => {
    const s = localStorage.getItem('forge_vFinal');
    if (s) {
        const d = JSON.parse(s);
        document.getElementById('charName').value = d.n || "";
        document.getElementById('critMargin').value = d.m || "20";
        document.getElementById('skillName').value = d.sn || "";
        document.getElementById('urlCrit').value = d.uc || "";
        document.getElementById('urlNormal').value = d.un || "";
        document.getElementById('urlFail').value = d.uf || "";
        document.getElementById('checkCrit').checked = d.cc || false;
        document.getElementById('checkNormal').checked = d.cn || false;
        document.getElementById('checkFail').checked = d.cf || false;
        if (d.dm) document.getElementById(d.dm).checked = true;
        document.getElementById('atkWeapon').value = d.aw || "";
        document.getElementById('atkDmgDice').value = d.ad || "1d6";
        document.getElementById('atkExtraDmg').value = d.ax || "";
        document.getElementById('atkCritMult').value = d.am || "3";
        document.getElementById('urlAtkCrit').value = d.uac || "";
        document.getElementById('urlAtkNorm').value = d.uan || "";
        document.getElementById('urlAtkFail').value = d.uaf || "";
        document.getElementById('checkAtkCrit').checked = d.cac || false;
        document.getElementById('checkAtkNorm').checked = d.can || false;
        document.getElementById('checkAtkFail').checked = d.caf || false;
        document.getElementById('queryTitle').value = d.qt || "Selecione o teste";
        document.getElementById('querySelectorCD').value = d.qcd || ""; // Novo
        document.getElementById('urlSelectorGif').value = d.usg || "";
        document.getElementById('checkSelectorGif').checked = d.csg || false; // Novo
        selectorButtons = d.sb || [];
        if (d.attrs) Object.keys(d.attrs).forEach(key => {
            const cb = document.querySelector(`.attr-mod[value="${key}"]`);
            if (cb) cb.checked = d.attrs[key];
        });
        renderButtons();
    }
    const log = localStorage.getItem('forge_log');
    if (log) { macroLog = JSON.parse(log); renderLog(); }
    const last = localStorage.getItem('forge_lastTab') || 'pericia';
    openTab(last);
};

function clearAllData() { if (confirm("Limpar tudo?")) { localStorage.clear(); location.reload(); } }