const NS = 'http://www.w3.org/2000/svg';
const $ = id => document.getElementById(id);
const fx = (v, d = 2) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d);
const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
function svgEl(tag, attrs, parent, text){
const e = document.createElementNS(NS, tag);
for (const a in attrs) e.setAttribute(a, attrs[a]);
if (text != null) e.textContent = text;
if (parent) parent.appendChild(e);
return e;
}
function segGroup(id, cb){
const g = $(id);
g.addEventListener('click', e => {
const b = e.target.closest('button[data-v]'); if (!b) return;
setSeg(id, b.dataset.v); cb(b.dataset.v);
});
}
function setSeg(id, v){ $(id).querySelectorAll('button[data-v]').forEach(o => o.setAttribute('aria-pressed', o.dataset.v === String(v))); }
function sliders(defs, P, box, onChange, pre = ''){
defs.forEach(d => {
const w = document.createElement('div'); w.className = 'param';
w.innerHTML = `<div class="top"><label for="p_${pre}${d.k}">${d.zh}<span class="en">${d.en}</span></label><output id="o_${pre}${d.k}"></output></div>
<input type="range" id="p_${pre}${d.k}" min="${d.min}" max="${d.max}" step="${d.step}">`;
box.appendChild(w);
$('p_' + pre + d.k).addEventListener('input', e => { P[d.k] = parseFloat(e.target.value); sync(); onChange(d.k); });
});
function sync(){ defs.forEach(d => { $('p_' + pre + d.k).value = P[d.k]; $('o_' + pre + d.k).textContent = d.fmt(P[d.k]); }); }
sync();
return sync;
}
/* engineering-notation formatter: eng(22.5e-6,'H') -> "22.5 µH" */
function eng(v, unit = '', digits = 3){
if (!isFinite(v)) return '—';
if (v === 0) return '0 ' + unit;
const pre = [[1e9,'G'],[1e6,'M'],[1e3,'k'],[1,''],[1e-3,'m'],[1e-6,'µ'],[1e-9,'n'],[1e-12,'p']];
const a = Math.abs(v);
for (const [m, p] of pre){
if (a >= m * 0.9995){ return String(parseFloat((v / m).toPrecision(digits))) + ' ' + p + unit; }
}
return (v / 1e-12).toPrecision(digits) + ' p' + unit;
}
const dB = x => 20 * Math.log10(Math.max(x, 1e-12));
/* nearest standard value: E6 for inductors, E12 for capacitors */
const E6 = [1.0, 1.5, 2.2, 3.3, 4.7, 6.8];
const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
function nearestE(v, series = E12){
const dec = Math.pow(10, Math.floor(Math.log10(v)));
let best = v, err = Infinity;
for (const k of [0.1, 1, 10]) for (const s of series){
const c = s * dec * k, e = Math.abs(Math.log(c / v));
if (e < err){ err = e; best = c; }
}
return best;
}
/* minimal complex arithmetic for frequency responses */
const C = (re, im = 0) => ({re, im});
const cadd = (a, b) => C(a.re + b.re, a.im + b.im);
const cmul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
const cinv = a => cdiv(C(1), a);
const cabs = a => Math.hypot(a.re, a.im);
const par = (...zs) => cinv(zs.reduce((s, z) => cadd(s, cinv(z)), C(0)));   // parallel impedances
/* small chart helper: draws axes, grid and ticks into an <svg>; returns scale functions */
function chart(svg, o){
const g = svgEl('g', {}, svg);
const {x0, y0, w, h} = o;
const lx = v => Math.log10(v);
const X = o.xlog ? v => x0 + (lx(v) - lx(o.xr[0])) / (lx(o.xr[1]) - lx(o.xr[0])) * w
: v => x0 + (v - o.xr[0]) / (o.xr[1] - o.xr[0]) * w;
const Y = v => y0 + h - (Math.min(Math.max(v, o.yr[0]), o.yr[1]) - o.yr[0]) / (o.yr[1] - o.yr[0]) * h;
svgEl('rect', {x: x0, y: y0, width: w, height: h, fill: 'var(--paper-2)', stroke: 'var(--line)'}, g);
(o.xticks || []).forEach(t => {
svgEl('line', {x1: X(t), x2: X(t), y1: y0, y2: y0 + h, class: 'axis', 'stroke-dasharray': '2 4'}, g);
svgEl('text', {x: X(t), y: y0 + h + 15, 'text-anchor': 'middle', class: 'tick'}, g, o.xfmt ? o.xfmt(t) : t);
});
(o.yticks || []).forEach(t => {
svgEl('line', {x1: x0, x2: x0 + w, y1: Y(t), y2: Y(t), class: 'axis', 'stroke-dasharray': '2 4'}, g);
svgEl('text', {x: x0 - 6, y: Y(t) + 4, 'text-anchor': 'end', class: 'tick'}, g, o.yfmt ? o.yfmt(t) : t);
});
if (o.xlabel) svgEl('text', {x: x0 + w, y: y0 + h + 30, 'text-anchor': 'end', class: 'lbl-sm'}, g, o.xlabel);
if (o.ylabel) svgEl('text', {x: x0, y: y0 - 8, class: 'lbl-sm'}, g, o.ylabel);
const clipId = 'clip' + Math.random().toString(36).slice(2, 8);
const cp = svgEl('clipPath', {id: clipId}, g);
svgEl('rect', {x: x0, y: y0 - 2, width: w, height: h + 4}, cp);
const plot = svgEl('g', {'clip-path': `url(#${clipId})`}, g);
function line(pts, attrs){
const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join('');
return svgEl('path', Object.assign({d, fill: 'none', 'stroke-width': 2.4, 'stroke-linejoin': 'round'}, attrs), plot);
}
return {g, plot, X, Y, line};
}
function clear(svg){ while (svg.firstChild) svg.removeChild(svg.firstChild); }
/* glossary of abbreviations: key -> [full English name, 中文說明] */
const GLOSS = {
"PA":["Power Amplifier", "功率放大器：把小訊號放大到足以推動負載（喇叭、天線）的功率"],
"BJT":["Bipolar Junction Transistor", "雙極性接面電晶體（NPN／PNP）"],
"MOSFET":["Metal-Oxide-Semiconductor Field-Effect Transistor", "金氧半場效電晶體，Class-D 的開關元件"],
"V<sub>be</sub>":["Base-Emitter Voltage", "BJT 基極－射極電壓，約 0.6–0.7 V 才開始明顯導通，溫度每升 1 °C 約降 2 mV"],
"I<sub>Q</sub>":["Quiescent Current", "靜態電流：沒有輸入訊號時流過輸出級的偏壓電流"],
"θ":["Conduction Angle", "導通角：一個訊號週期（360°）中，電晶體有電流流過的角度"],
"RF":["Radio Frequency", "射頻：無線通訊用的高頻訊號"],
"THD+N":["Total Harmonic Distortion plus Noise", "總諧波失真加雜訊，音響最常用的失真指標"],
"PWM":["Pulse-Width Modulation", "脈衝寬度調變：用脈衝的寬窄代表訊號大小"],
"PDM":["Pulse-Density Modulation", "脈衝密度調變：用脈衝的疏密代表訊號大小，常見於數位麥克風"],
"AD／BD":["AD (two-level) / BD (three-level) Modulation", "兩種 Class-D 調變法：AD 兩端互補切換；BD 兩端各自調變，無訊號時差動電壓幾乎為零"],
"SE":["Single-Ended", "單端輸出：喇叭一端接放大器、一端接地"],
"BTL":["Bridge-Tied Load", "橋接負載：喇叭兩端各接一個半橋，同樣電源下電壓擺幅加倍、功率約 4 倍"],
"H-bridge":["H-Bridge (Full Bridge)", "全橋：Q1–Q4 四顆開關，BTL Class-D 的輸出級"],
"LC":["Inductor-Capacitor Filter", "電感電容濾波器"],
"LPF":["Low-Pass Filter", "低通濾波器"],
"f<sub>sw</sub>":["Switching Frequency", "開關頻率：Class-D 的 PWM 載波頻率"],
"f<sub>c</sub>":["Cut-off Frequency", "截止頻率：濾波器響應掉 3 dB（Butterworth）的頻率"],
"Q":["Quality Factor", "品質因數：決定濾波器在截止頻率附近有沒有突起；Butterworth 為 0.707"],
"R<sub>DS(on)</sub>":["Drain-Source On-Resistance", "MOSFET 導通電阻，決定 I²R 導通損耗"],
"Re／Le":["Voice-Coil Resistance / Inductance", "喇叭音圈的直流電阻與電感，喇叭阻抗高頻上升的原因"],
"Zobel":["Zobel Network", "串聯 RC 補償網路，並在喇叭上抵消音圈電感，讓負載看起來像電阻"],
"FB":["Ferrite Bead", "鐵氧體磁珠：低頻像小電感、高頻像電阻，把高頻能量變成熱"],
"I<sub>sat</sub>":["Saturation Current", "電感飽和電流：超過後電感量急降"],
"ESR／ESL":["Equivalent Series Resistance / Inductance", "電容的等效串聯電阻／電感"],
"C0G／X7R":["Class 1 / Class 2 Ceramic Dielectrics", "陶瓷電容材質：C0G 容量幾乎不隨電壓改變；X7R 容量會隨直流偏壓下降"],
"EMI／EMC":["Electromagnetic Interference / Compatibility", "電磁干擾／電磁相容"],
"FCC":["Federal Communications Commission", "美國聯邦通訊委員會，規範 30 MHz–1 GHz 輻射發射限值"],
"CISPR":["Comité International Spécial des Perturbations Radioélectriques", "國際無線電干擾特別委員會，制定 CISPR 32（多媒體）、CISPR 25（車用）等 EMI 標準"],
"SSM":["Spread-Spectrum Modulation", "展頻調變：讓開關頻率小幅抖動，把頻譜峰值打散"],
"PSRR":["Power Supply Rejection Ratio", "電源抑制比：電源漣波傳到輸出的衰減量"],
"DSP":["Digital Signal Processor", "數位訊號處理器"],
"IV sense":["Current and Voltage Sense", "即時量測喇叭電流與電壓，用來估算音圈溫度與振膜位移"],
"Smart PA":["Smart Power Amplifier", "內建 DSP 與 IV sense、可做喇叭保護的 Class-D 放大器，手機主流"],
"Class-H":["Class-H (Rail Tracking)", "電源軌跟隨訊號包絡調整；手機 Smart PA 的升壓電壓隨音量動態變化"],
"SPL":["Sound Pressure Level", "聲壓級（dB SPL）"],
"I²S／TDM":["Inter-IC Sound / Time-Division Multiplexing", "數位音訊介面，手機 SoC 直接送數位音訊給 Smart PA"],
"PVDD":["Power-Stage Supply Voltage", "Class-D 功率級的電源腳位"],
"dB":["Decibel", "分貝：功率比 10·log，電壓比 20·log"],
"SoC":["System on Chip", "系統單晶片，手機主處理器"],
"V<sub>T</sub>":["Thermal Voltage", "熱電壓 kT/q，室溫約 26 mV，決定 BJT 電流隨 V<sub>be</sub> 指數變化的斜率"],
"g<sub>m</sub>":["Transconductance", "跨導：電流隨輸入電壓的變化率；BJT 為 I<sub>C</sub>／V<sub>T</sub>"],
"R<sub>e</sub>":["Emitter Resistor", "射極電阻：輸出管射極串聯的小電阻（常見 0.1–0.47 Ω），穩定偏壓並分流"],
"V<sub>q</sub>":["Quiescent Voltage across R<sub>e</sub>", "靜態時每顆射極電阻上的壓降 I<sub>Q</sub>·R<sub>e</sub>"],
"EF":["Emitter Follower", "射極跟隨器：輸出取自射極，電壓增益約 1、電流增益大"],
"CFP":["Complementary Feedback Pair (Sziklai)", "互補回授對：用一顆小訊號管＋一顆功率管組成的複合輸出管"],
"NFB":["Negative Feedback", "負回授：把輸出拉回輸入比較，壓低失真"],
"Class-G":["Class-G (Rail Switching)", "依訊號大小在兩組電源軌之間切換的線性放大器"],
"θ<sub>JC</sub>／θ<sub>CS</sub>／θ<sub>SA</sub>":["Thermal Resistance: Junction-Case / Case-Sink / Sink-Ambient", "熱阻（°C/W）：晶片到外殼、外殼到散熱片（含絕緣墊）、散熱片到空氣"],
"T<sub>j</sub>":["Junction Temperature", "接面溫度：晶片內部溫度，常見上限 150 °C"],
"V<sub>be</sub> multiplier":["V<sub>be</sub> Multiplier (Amplified Diode)", "V<sub>be</sub> 倍增器：用一顆電晶體加兩顆電阻產生 V<sub>be</sub>·(1 + R1/R2) 的偏壓，並靠溫度追蹤做熱補償"],
"ZTC":["Zero Temperature Coefficient Point", "零溫度係數點：MOSFET 在這個閘極電壓（電流）以下是正溫度係數，以上是負溫度係數"],
"PGND／AGND":["Power Ground / Analog Ground", "功率地（開關大電流）與類比地（回授、調變器、小訊號參考）"],
"SW node":["Switching Node", "開關節點：MOSFET 輸出接到電感或磁珠的那段銅箔，電壓在數奈秒內跳變"],
"dV/dt／dI/dt":["Voltage / Current Slew Rate", "電壓、電流變化率；dV/dt 造成共模（電容耦合）雜訊，dI/dt 造成差模（迴路）雜訊"],
"DM／CM":["Differential Mode / Common Mode", "差模：電流一去一回；共模：兩條線同向流動、經雜散電容回地，通常是線纜輻射的主因"],
"Snubber":["RC Snubber", "緩衝電路：電阻串電容，吸收寄生電感與電容的振鈴"],
"C<sub>oss</sub>":["Output Capacitance", "MOSFET 汲源極輸出電容"],
"RBW":["Resolution Bandwidth", "頻譜量測的解析頻寬：CISPR 在 150 kHz–30 MHz 用 9 kHz，30 MHz–1 GHz 用 120 kHz"],
"ESD":["Electrostatic Discharge", "靜電放電"],
"Desense":["Receiver Desensitization", "接收靈敏度劣化：板上雜訊落在 LTE／Wi-Fi／GNSS 頻段，讓手機收訊變差"],
"dBm":["Decibel-milliwatts", "以 1 mW 為基準的功率：0 dBm = 1 mW、30 dBm = 1 W"],
"PAE":["Power-Added Efficiency", "功率附加效率 (P_out − P_in)／P_DC，扣掉輸入驅動功率"],
"PAPR":["Peak-to-Average Power Ratio", "峰均功率比：調變訊號峰值功率比平均功率高多少 dB"],
"ACLR":["Adjacent Channel Leakage Ratio", "鄰道洩漏比：本通道功率比相鄰通道洩漏功率高多少 dB，PA 非線性會讓它變差"],
"EVM":["Error Vector Magnitude", "誤差向量幅度：實際星座點偏離理想點的比例"],
"Doherty":["Doherty Amplifier", "主放大器＋峰值放大器以 λ/4 線做負載調變，在回退功率仍維持高效率"],
"ET／APT":["Envelope Tracking / Average Power Tracking", "包絡追蹤：PA 電源即時跟著訊號包絡；平均功率追蹤：電源依每個時槽的平均功率調整"],
"DPD":["Digital Predistortion", "數位預失真：在基頻先做 PA 非線性的反函數，讓輸出變線性"],
"AM/AM／AM/PM":["Amplitude-to-Amplitude / Amplitude-to-Phase Distortion", "輸入振幅改變時，輸出振幅（壓縮）與相位跟著變化的非線性"],
"P1dB":["1 dB Compression Point", "增益比線性區掉 1 dB 時的功率"],
"HBT":["Heterojunction Bipolar Transistor", "異質接面雙極電晶體，手機 PA 主流的 GaAs 功率元件"],
"GaAs／GaN":["Gallium Arsenide / Gallium Nitride", "砷化鎵（手機 PA）／氮化鎵（基地台、高功率）半導體"],
"ZVS":["Zero-Voltage Switching", "零電壓切換：開關導通瞬間兩端電壓為零，沒有電容放電損耗"],
"R<sub>opt</sub>":["Optimum Load (Load-line) Resistance", "負載線最佳負載：(V_DD − V_knee)²／(2·P_out)"],
"V<sub>knee</sub>":["Knee Voltage", "膝點電壓：電晶體離開飽和區所需的最小電壓"],
"UE／HPUE":["User Equipment / High-Power UE", "使用者設備（手機）；高功率手機（Power Class 2，26 dBm）"],
"OFDM":["Orthogonal Frequency-Division Multiplexing", "正交分頻多工，LTE／5G 的調變方式，PAPR 高"],
"IEC 62368-1":["IEC 62368-1 Audio/Video, ICT Equipment Safety", "影音與資通訊設備安全標準，音響溫升測試用 1/8 最大不削波功率的粉紅雜訊"]
};
function glossary(box, keys){
box.innerHTML = '<div class="scroll-x"><table class="gloss"><thead><tr><th>縮寫</th><th>完整英文名稱</th><th>中文意思與說明</th></tr></thead><tbody>' +
keys.map(k => `<tr><td>${k}</td><td>${GLOSS[k][0]}</td><td>${GLOSS[k][1]}</td></tr>`).join('') + '</tbody></table></div>';
}
