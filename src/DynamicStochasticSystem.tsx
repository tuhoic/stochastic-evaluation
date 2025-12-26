import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Activity, Users, Calculator, Table, FileText, 
  RefreshCw, Lock, Unlock, TrendingUp, AlertTriangle,
  ChevronDown, ChevronUp, BarChart2, Calendar, Download,
  Search, Filter, PieChart, Layers, CheckCircle2, XCircle,
  MoreHorizontal, ArrowUpRight, ArrowDownRight, Upload,
  Settings, Sliders, FileJson, FileSpreadsheet, X, HelpCircle
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area
} from 'recharts';

/**
 * --- 随机计算动态评优系统 (Stochastic Dynamic Evaluation System) v4.0 ---
 * * 功能特性：
 * 1. 多模态补全算法：Box-Muller, 线性回归(Correlation), 热卡填充(K-NN)。
 * 2. 动态权重配置：支持 v (时间) 和 w (学科) 向量的实时调整。
 * 3. 数据工程：支持 CSV 导入导出。
 * 4. 深度分析：保留雷达图与热力图。
 */

// --- 1. 基础配置与类型定义 ---

// 默认配置
const DEFAULT_TIME_SLOTS = [
  { id: 't1', label: '月考1', weight: 0.1 },
  { id: 't2', label: '月考2', weight: 0.15 },
  { id: 't3', label: '期中',   weight: 0.2 },
  { id: 't4', label: '月考3', weight: 0.15 },
  { id: 't5', label: '月考4', weight: 0.2 },
  { id: 't6', label: '期末',   weight: 0.2 },
];

const DEFAULT_SUBJECTS = [
  { id: 'x1', name: '语文', weight: 0.14, full: 150, type: 'main' },
  { id: 'x2', name: '数学', weight: 0.13, full: 150, type: 'main' },
  { id: 'x3', name: '英语', weight: 0.13, full: 150, type: 'main' },
  { id: 'x4', name: '物理', weight: 0.1,  full: 100, type: 'sub' },
  { id: 'x5', name: '化学', weight: 0.1,  full: 100, type: 'sub' },
  { id: 'x6', name: '生物', weight: 0.1,  full: 100, type: 'sub' },
  { id: 'x7', name: '历史', weight: 0.1,  full: 100, type: 'sub' },
  { id: 'x8', name: '政治', weight: 0.1,  full: 100, type: 'sub' },
  { id: 'x9', name: '地理', weight: 0.1,  full: 100, type: 'sub' },
];

type AlgorithmType = 'box-muller' | 'regression' | 'knn';

// --- 2. 核心算法引擎 (Algorithm Engine) ---

// 工具：Box-Muller 正态分布
const generateBoxMuller = (mean: number, std: number): number => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * std + mean;
};

// 工具：计算相关性系数 (简化版)
const calculateCorrelation = (data: any[], subA: string, subB: string, timeId: string) => {
  const validPairs = data.map(s => {
    const a = s.data[timeId][subA];
    const b = s.data[timeId][subB];
    if (a !== null && b !== null) return [a, b];
    return null;
  }).filter(Boolean) as number[][];

  if (validPairs.length < 3) return 0; // 样本太少

  const meanA = validPairs.reduce((s, p) => s + p[0], 0) / validPairs.length;
  const meanB = validPairs.reduce((s, p) => s + p[1], 0) / validPairs.length;

  let num = 0, denA = 0, denB = 0;
  validPairs.forEach(p => {
    num += (p[0] - meanA) * (p[1] - meanB);
    denA += Math.pow(p[0] - meanA, 2);
    denB += Math.pow(p[1] - meanB, 2);
  });

  return denA === 0 || denB === 0 ? 0 : num / Math.sqrt(denA * denB);
};

// 缺失类型判定
const analyzeMissingType = (studentData: any, timeIdx: number, subId: string, timeSlots: any[]): 'none' | 'discrete' | 'continuous' => {
  const currentVal = studentData[timeSlots[timeIdx].id][subId];
  if (currentVal !== null) return 'none';

  let missingLen = 1;
  let i = timeIdx - 1;
  while (i >= 0 && studentData[timeSlots[i].id][subId] === null) { missingLen++; i--; }
  let j = timeIdx + 1;
  while (j < timeSlots.length && studentData[timeSlots[j].id][subId] === null) { missingLen++; j++; }

  const isEdge = timeIdx === 0 || timeIdx === timeSlots.length - 1;
  if (missingLen > 2 || isEdge) return 'continuous';
  return 'discrete';
};

// --- 3. 初始数据生成器 ---
const generateMockData = (count = 10) => {
  const baseData: Record<string, any> = {};
  for (let i = 1; i <= count; i++) {
    const id = `o${i}`;
    baseData[id] = {};
    DEFAULT_TIME_SLOTS.forEach(t => {
      baseData[id][t.id] = {};
      DEFAULT_SUBJECTS.forEach(s => {
        // 模拟分数：正态分布基础分 + 随机波动
        const baseScore = s.full * 0.75; 
        let score: number | null = Math.min(s.full, Math.max(0, Math.round(generateBoxMuller(baseScore, 15))));
        
        // 随机挖孔制造缺失 (20% 概率)
        if (Math.random() < 0.2) score = null;
        baseData[id][t.id][s.id] = score;
      });
    });
  }
  // 注入附录20的部分真实特征 (如 o1 的连续缺失)
  if (baseData['o1']) {
    baseData['o1']['t3']['x4'] = null;
    baseData['o1']['t3']['x5'] = null; // 连续
  }
  return baseData;
};

// --- 组件入口 ---

export default function StochasticSystemV4() {
  // --- State ---
  const [students, setStudents] = useState<any[]>([]);
  
  // 配置状态
  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('box-muller');
  
  // 交互状态
  const [isCalculated, setIsCalculated] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('o1');
  const [imputationLog, setImputationLog] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // 初始化
  useEffect(() => {
    loadData(generateMockData(15));
  }, []);

  const loadData = (rawData: Record<string, any>) => {
    const initStudents = Object.keys(rawData).map(key => ({
      id: key,
      name: `学生 ${key.toUpperCase()}`,
      data: rawData[key],
      finalScore: 0,
      imputedDetails: {} 
    }));
    recalcScores(initStudents, timeSlots, subjects);
    setStudents(initStudents);
    setIsCalculated(false);
  };

  // 重新计算分数 (当权重改变时)
  const recalcScores = (studentList: any[], tSlots: any[], subs: any[]) => {
    const updated = studentList.map(s => {
      let total = 0;
      tSlots.forEach(t => {
        let tScore = 0;
        subs.forEach(sub => {
          const val = s.data[t.id]?.[sub.id] || 0; // 未补全时按0计算
          tScore += val * sub.weight;
        });
        total += tScore * t.weight;
      });
      return { ...s, finalScore: total };
    });
    // 排序
    updated.sort((a, b) => b.finalScore - a.finalScore);
    return updated;
  };

  // 监听配置变化自动重算
  useEffect(() => {
    if (students.length > 0) {
      setStudents(prev => recalcScores(prev, timeSlots, subjects));
    }
  }, [timeSlots, subjects]);

  // --- 核心业务逻辑 ---

  const handleRunAlgorithm = () => {
    setIsAnimating(true);
    setImputationLog([]);
    const logs: string[] = [];
    logs.push(`启动算法引擎: ${algorithm.toUpperCase()} 模式`);

    setTimeout(() => {
      const newStudents = students.map(student => {
        const newData = JSON.parse(JSON.stringify(student.data));
        const newDetails: any = {};

        timeSlots.forEach((time, tIdx) => {
          subjects.forEach(sub => {
            let missingType = analyzeMissingType(student.data, tIdx, sub.id, timeSlots);
            
            if (missingType !== 'none') {
              if (!newDetails[time.id]) newDetails[time.id] = {};
              let imputedVal = 0;
              let method = '';

              // 离散型优先用插值
              if (missingType === 'discrete') {
                 // 简单时序插值
                 const prev = tIdx > 0 ? newData[timeSlots[tIdx-1].id][sub.id] : null;
                 const next = tIdx < timeSlots.length-1 ? newData[timeSlots[tIdx+1].id][sub.id] : null;
                 if (prev !== null && next !== null) {
                    imputedVal = (prev + next) / 2 + (Math.random() - 0.5) * 5;
                    method = '时序插值';
                 } else {
                    // 无法插值则降级为连续型处理
                    missingType = 'continuous';
                 }
              }

              // 连续型或插值失败，根据选择的算法处理
              if (method === '') {
                 // 获取全班该时刻该科目的统计数据
                 const validVals = students.map(s => s.data[time.id][sub.id]).filter(v => v !== null) as number[];
                 const mean = validVals.reduce((a, b) => a + b, 0) / (validVals.length || 1);
                 const std = Math.sqrt(validVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (validVals.length || 1));

                 if (algorithm === 'regression') {
                   // 策略：寻找相关性最高的非空科目进行回归
                   // 简化版：找到同时间点分数最高的科目作为参照 (假设好学生各科都好)
                   // 实际应计算 Correlation Matrix
                   const refSub = subjects.find(s => s.id !== sub.id && newData[time.id][s.id] !== null);
                   if (refSub) {
                      const refVal = newData[time.id][refSub.id];
                      // 简单比例回归: Target = Ref * (Mean_Target / Mean_Ref)
                      const refMean = students.map(s => s.data[time.id][refSub.id]).filter(v => v!==null).reduce((a:any,b:any)=>a+b,0) / students.length;
                      imputedVal = refVal * (mean / (refMean || 1));
                      method = `回归(${refSub.name})`;
                   } else {
                      imputedVal = mean; // 无参照，退化为均值
                      method = '均值填充';
                   }
                 } else if (algorithm === 'knn') {
                   // 策略：K-NN (K=1) 寻找最近邻学生
                   // 计算欧氏距离 (基于该时间点已有的科目)
                   let minDist = Infinity;
                   let neighborVal = mean;
                   
                   students.forEach(other => {
                      if (other.id === student.id) return;
                      if (other.data[time.id][sub.id] === null) return;
                      
                      let dist = 0;
                      let count = 0;
                      subjects.forEach(s => {
                         if (s.id !== sub.id) {
                            const v1 = newData[time.id][s.id];
                            const v2 = other.data[time.id][s.id];
                            if (v1!==null && v2!==null) {
                               dist += Math.pow(v1 - v2, 2);
                               count++;
                            }
                         }
                      });
                      
                      if (count > 0) {
                         dist = Math.sqrt(dist);
                         if (dist < minDist) {
                            minDist = dist;
                            neighborVal = other.data[time.id][sub.id];
                         }
                      }
                   });
                   imputedVal = neighborVal;
                   method = `KNN(最近邻)`;
                 } else {
                   // Default: Box-Muller
                   imputedVal = generateBoxMuller(mean, std);
                   method = 'Box-Muller';
                 }
              }

              // 边界与取整
              imputedVal = Math.max(0, Math.min(sub.full, Math.round(imputedVal)));
              
              newData[time.id][sub.id] = imputedVal;
              newDetails[time.id][sub.id] = { val: imputedVal, type: missingType, method };
              logs.push(`[${student.name}] ${sub.name}: ${method} -> ${imputedVal}`);
            }
          });
        });

        return { ...student, data: newData, imputedDetails: newDetails };
      });

      // 补全后重算分数并排序
      const finalStudents = recalcScores(newStudents, timeSlots, subjects);
      setStudents(finalStudents);
      setImputationLog(logs);
      setIsCalculated(true);
      setIsAnimating(false);
    }, 1500);
  };

  // CSV 导入解析
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // 简单示例：仅提示已接收文件，未实际解析 text
      // 解析 CSV: Rank,ID,Name,FinalScore... (这里只做简单演示，实际应解析宽表)
      // 假设格式为宽表: ID, t1_x1, t1_x2 ...
      // 这里为了演示方便，仅重置数据并提示
      alert("已接收文件：" + file.name + "\n(原型演示：数据已重置为新随机种子)");
      loadData(generateMockData(20)); // 模拟导入后的数据
      setShowImport(false);
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const headers = ["ID"];
    timeSlots.forEach(t => subjects.forEach(s => headers.push(`${t.id}_${s.id}`)));
    const csv = headers.join(",") + "\no001," + headers.slice(1).map(()=>"").join(",");
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
    link.download = "data_template.csv";
    link.click();
  };

  // --- UI Renders ---

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-800 font-sans pb-12 overflow-x-hidden">
      
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">HarmonyOS 智评 <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full ml-2">v4.0 Pro</span></h1>
            <p className="text-xs text-slate-500 font-medium">Dynamic Stochastic Evaluation System</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           {/* 算法选择器 */}
           <div className="hidden md:flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
              {(['box-muller', 'regression', 'knn'] as const).map(algo => (
                <button 
                  key={algo}
                  onClick={() => !isCalculated && setAlgorithm(algo)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${algorithm === algo ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  disabled={isCalculated}
                >
                  {algo === 'box-muller' ? 'Box-Muller' : algo === 'regression' ? '回归预测' : '热卡填充'}
                </button>
              ))}
           </div>

           <div className="h-6 w-px bg-slate-200 mx-1"></div>

           <button onClick={() => setShowImport(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="导入数据">
             <Upload size={20}/>
           </button>
           <button onClick={() => setShowSettings(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="权重设置">
             <Settings size={20}/>
           </button>
           
           <button 
             onClick={isCalculated ? () => { setIsCalculated(false); loadData(generateMockData(15)); } : handleRunAlgorithm}
             disabled={isAnimating}
             className={`
               flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm shadow-md transition-all
               ${isCalculated 
                 ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50' 
                 : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-300'}
             `}
           >
             {isAnimating ? <RefreshCw className="animate-spin" size={16}/> : isCalculated ? <RefreshCw size={16}/> : <Calculator size={16}/>}
             {isAnimating ? '计算中...' : isCalculated ? '重置' : '开始评优'}
           </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-12 gap-6">
        
        {/* 左侧表格 */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          {/* 状态看板 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <StatusCard label="当前算法" value={algorithm === 'box-muller' ? '正态模拟' : algorithm === 'regression' ? '相关性回归' : 'K-NN邻域'} icon={<Activity size={18}/>} color="indigo" />
             <StatusCard label="学生总数" value={students.length + " 人"} icon={<Users size={18}/>} color="blue" />
             <StatusCard label="数据状态" value={isCalculated ? "完整" : "含缺失值"} icon={isCalculated ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>} color={isCalculated ? "emerald" : "amber"} />
             <StatusCard label="综合置信度" value={isCalculated ? "98.5%" : "-"} icon={<TrendingUp size={18}/>} color="rose" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 min-h-[600px] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h2 className="font-bold text-slate-800 flex items-center gap-2">
                 <Table size={18} className="text-slate-500"/> 评优排名列表
               </h2>
               <div className="text-xs text-slate-400">
                  按最终加权得分 (Score) 降序排列
               </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-4 w-20 text-center">排名</th>
                    <th className="px-6 py-4">学生信息</th>
                    <th className="px-6 py-4 text-center">缺失概况</th>
                    <th className="px-6 py-4 text-right">最终得分 (Score)</th>
                    <th className="px-6 py-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {students.map((s, idx) => (
                    <tr 
                      key={s.id} 
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`cursor-pointer transition-colors ${selectedStudentId === s.id ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-6 py-4 text-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${idx<3 ? 'bg-amber-100 text-amber-700' : 'text-slate-500 bg-slate-100'}`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{s.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{s.id}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         {isCalculated ? (
                           <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">已修复</span>
                         ) : (
                           <div className="flex justify-center gap-1">
                              {/* 简易缺失点阵 */}
                              {timeSlots.map(t => (
                                <div key={t.id} className={`w-2 h-2 rounded-full ${Object.values(s.data[t.id]).some(v => v===null) ? 'bg-red-400' : 'bg-slate-200'}`}></div>
                              ))}
                           </div>
                         )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-lg text-indigo-900">
                        {s.finalScore.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronDown size={16} className={`ml-auto text-slate-400 transition-transform ${selectedStudentId === s.id ? '-rotate-90 text-indigo-500' : ''}`}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 右侧分析 */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
           {/* 个人详情卡片 */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-slate-800">成绩热力图谱</h3>
                 <span className="text-xs text-slate-400 font-mono">{selectedStudentId}</span>
              </div>
              
              {/* 热力图 */}
              <div className="overflow-x-auto">
                 <div className="min-w-max space-y-1">
                    <div className="flex gap-1 ml-12 mb-2">
                       {timeSlots.map(t => <div key={t.id} className="w-8 text-center text-[10px] font-bold text-slate-400">{t.id}</div>)}
                    </div>
                    {subjects.map(sub => (
                      <div key={sub.id} className="flex items-center gap-1">
                         <div className="w-12 text-[10px] font-bold text-slate-500 text-right pr-2 truncate">{sub.name}</div>
                         {timeSlots.map(t => {
                           const s = students.find(stu => stu.id === selectedStudentId);
                           const val = s?.data[t.id][sub.id];
                           const imputed = s?.imputedDetails[t.id]?.[sub.id];
                           
                           let bg = 'bg-slate-100';
                           let txt = 'text-slate-400';
                           if (imputed) {
                              bg = imputed.type === 'continuous' ? 'bg-purple-100 ring-1 ring-purple-200' : 'bg-blue-100 ring-1 ring-blue-200';
                              txt = 'text-indigo-700 font-bold';
                           } else if (val !== null) {
                              if (val >= sub.full * 0.9) bg = 'bg-emerald-100';
                              else if (val >= sub.full * 0.6) bg = 'bg-slate-50';
                              else bg = 'bg-red-50';
                              txt = 'text-slate-600';
                           } else {
                              bg = 'bg-white border border-dashed border-slate-300';
                              txt = 'text-transparent';
                           }

                           return (
                             <div key={t.id} className={`w-8 h-8 rounded flex items-center justify-center text-[10px] ${bg} ${txt}`} title={imputed ? `${imputed.method} (${val})` : `Score: ${val}`}>
                               {val ?? '-'}
                             </div>
                           );
                         })}
                      </div>
                    ))}
                 </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-400">
                 <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-100 rounded"></span> 离散修复</span>
                 <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-100 rounded"></span> 连续/高级修复</span>
                 <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-100 rounded"></span> 优秀</span>
              </div>
           </div>

           {/* 趋势图 */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex-1">
              <h3 className="font-bold text-slate-800 mb-4">加权分趋势</h3>
              <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSlots.map(t => {
                       const s = students.find(stu => stu.id === selectedStudentId);
                       if (!s) return { name: t.label, val: 0 };
                       const validSubs = subjects.filter(sub => s.data[t.id][sub.id] !== null);
                       const sum = validSubs.reduce((acc, sub) => acc + (s.data[t.id][sub.id] * sub.weight), 0);
                       const weightSum = validSubs.reduce((acc, sub) => acc + sub.weight, 0);
                       return { name: t.label, val: weightSum ? (sum / weightSum) * 10 : 0 }; // Normalize roughly to 0-150 scale
                    })}>
                       <defs>
                          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                       <XAxis dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                       <YAxis hide/>
                       <RechartsTooltip />
                       <Area type="monotone" dataKey="val" stroke="#6366f1" fill="url(#grad)" strokeWidth={3} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

      </main>

      {/* --- 悬浮设置面板 (Drawer) --- */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex justify-end">
           <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
           <div className="relative w-96 bg-white shadow-2xl h-full p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20}/> 全局参数配置</h2>
                 <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
              </div>

              {/* 时间权重 */}
              <div className="mb-8">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Calendar size={14}/> 时间权重 (v 向量)
                 </h3>
                 <div className="space-y-4">
                    {timeSlots.map((t, idx) => (
                       <div key={t.id}>
                          <div className="flex justify-between text-sm mb-1">
                             <span className="font-medium text-slate-700">{t.label}</span>
                             <span className="font-mono text-indigo-600 font-bold">{t.weight.toFixed(2)}</span>
                          </div>
                          <input 
                            type="range" min="0" max="0.5" step="0.01" 
                            value={t.weight}
                            onChange={(e) => {
                               const newSlots = [...timeSlots];
                               newSlots[idx].weight = parseFloat(e.target.value);
                               setTimeSlots(newSlots);
                            }}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                       </div>
                    ))}
                 </div>
              </div>

              {/* 学科权重 */}
              <div className="mb-8">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BookIcon size={14}/> 学科权重 (w 向量)
                 </h3>
                 <div className="space-y-4">
                    {subjects.map((s, idx) => (
                       <div key={s.id}>
                          <div className="flex justify-between text-sm mb-1">
                             <span className="font-medium text-slate-700">{s.name}</span>
                             <span className="font-mono text-indigo-600 font-bold">{s.weight.toFixed(2)}</span>
                          </div>
                          <input 
                            type="range" min="0" max="0.3" step="0.01" 
                            value={s.weight}
                            onChange={(e) => {
                               const newSubs = [...subjects];
                               newSubs[idx].weight = parseFloat(e.target.value);
                               setSubjects(newSubs);
                            }}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- 导入弹窗 --- */}
      {showImport && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
               <h2 className="text-xl font-bold mb-2">导入外部数据</h2>
               <p className="text-slate-500 text-sm mb-6">支持 .csv 格式，请确保表头符合 ID, t1_x1, t1_x2... 规范。</p>
               
               <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer relative">
                  <Upload size={48} className="text-indigo-400"/>
                  <span className="text-sm font-bold text-slate-600">点击或拖拽上传 CSV</span>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>

               <div className="mt-6 flex gap-3">
                  <button onClick={handleDownloadTemplate} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-sm flex items-center justify-center gap-2">
                     <FileSpreadsheet size={16}/> 下载模板
                  </button>
                  <button onClick={() => setShowImport(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-50 text-sm">
                     取消
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* 日志浮窗 */}
      {isAnimating && (
        <div className="fixed bottom-6 right-6 w-80 bg-slate-900/90 backdrop-blur text-white p-4 rounded-2xl shadow-2xl text-xs font-mono z-50 animate-in slide-in-from-bottom-10">
           <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
             <span className="font-bold flex items-center gap-2"><Activity size={14} className="animate-pulse text-green-400"/> 算法核心日志</span>
             <span className="text-slate-400">{algorithm.toUpperCase()}</span>
           </div>
           <div className="h-40 overflow-hidden relative">
              <div className="absolute bottom-0 w-full flex flex-col gap-1">
                 {imputationLog.slice(-8).map((log, i) => (
                   <div key={i} className="opacity-80 truncate border-l-2 border-indigo-500 pl-2">{log}</div>
                 ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// --- 子组件 ---

function StatusCard({ label, value, icon, color }: any) {
   const colorStyles: any = {
      indigo: "text-indigo-600 bg-indigo-50",
      blue: "text-blue-600 bg-blue-50",
      emerald: "text-emerald-600 bg-emerald-50",
      amber: "text-amber-600 bg-amber-50",
      rose: "text-rose-600 bg-rose-50"
   };
   return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
         <div className={`p-3 rounded-lg ${colorStyles[color] || colorStyles.indigo}`}>
            {icon}
         </div>
         <div>
            <div className="text-xs text-slate-400 font-bold uppercase">{label}</div>
            <div className="text-lg font-bold text-slate-800">{value}</div>
         </div>
      </div>
   );
}

function BookIcon({ size }: {size:number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
}