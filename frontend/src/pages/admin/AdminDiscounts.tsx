import axios from 'axios';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, unwrap } from '../../api/client';
type Discount = {id:number;code:string;type:string;value:number;startsAt:string;endsAt:string;active:boolean};
const localDate = (iso:string) => {const d=new Date(iso); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const empty = () => ({code:'',type:'PERCENT',value:10,startsAt:localDate(new Date().toISOString()),endsAt:localDate(new Date(Date.now()+7*86400000).toISOString()),active:true});

function discountError(error: unknown, fallback: string) {
 if (!axios.isAxiosError(error)) return fallback;
 const status = error.response?.status;
 if (!status) return 'Không kết nối được API mã giảm giá. Kiểm tra backend và kết nối mạng.';
 if (status === 401) return 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại tài khoản admin. (401)';
 if (status === 403) return 'Yêu cầu bị từ chối. Kiểm tra quyền admin và cấu hình CORS trên backend. (403)';
 if (status === 404) return 'Backend đang kết nối chưa có API mã giảm giá. Kiểm tra địa chỉ API và phiên bản backend. (404)';
 if (status >= 500) return 'Backend lỗi khi xử lý mã giảm giá. Cần kiểm tra log server và bảng discount_codes. (' + status + ')';
 const payload = error.response?.data;
 const message = typeof payload?.message === 'string' ? payload.message : typeof payload?.error === 'string' ? payload.error : fallback;
 return message + ' (' + status + ')';
}

export function AdminDiscounts() {
 const [items,setItems]=useState<Discount[]>([]);
 const [form,setForm]=useState(empty);
 const [editing,setEditing]=useState<number|null>(null);
 const [saving,setSaving]=useState(false);
 const [updatingStatus,setUpdatingStatus]=useState<number|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 async function load(){setLoading(true);try{setItems(await unwrap<Discount[]>(api.get('/discounts')));setError('');}catch(e){setError(discountError(e,'Không tải được danh sách mã giảm giá.'));}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 async function toggleStatus(item:Discount) {
   setUpdatingStatus(item.id);
   try {
     const updated = await unwrap<Discount>(api.put('/discounts/'+item.id, {
       code:item.code, type:item.type, value:item.value,
       startsAt:item.startsAt, endsAt:item.endsAt, active:!item.active
     }));
     setItems(current=>current.map(row=>row.id===updated.id?updated:row));
     if (editing===updated.id) setForm(current=>({...current,active:updated.active}));
     toast.success(updated.active?'Đã bật mã giảm giá.':'Đã tắt mã giảm giá.');
   } catch(e:any) {
     toast.error(discountError(e, 'Không cập nhật được trạng thái.'));
   } finally { setUpdatingStatus(null); }
 }
 async function save(e:React.FormEvent){e.preventDefault();if(new Date(form.endsAt)<=new Date(form.startsAt)){toast.error('Ngày kết thúc phải sau ngày bắt đầu.');return;}setSaving(true);try{
 const body={...form,code:form.code.trim().toUpperCase(),startsAt:new Date(form.startsAt).toISOString(),endsAt:new Date(form.endsAt).toISOString()};
 await (editing ? api.put('/discounts/'+editing,body):api.post('/discounts',body));toast.success('Đã lưu mã giảm giá.');setEditing(null);setForm(empty());await load();
 }catch(e:any){toast.error(discountError(e, 'Không lưu được mã giảm giá.'));}finally{setSaving(false);}}
 return <div className="space-y-6">
 <h1 className="text-2xl font-extrabold">Mã giảm giá</h1>
 <p className="text-sm text-slate-600">Áp dụng cho mọi gói trả phí. Thời gian theo múi giờ thiết bị. Số tiền thanh toán tối thiểu 1.000đ.</p>
 <form onSubmit={save} className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-3">
 <label className="text-sm font-bold">Mã giảm giá<input className="input mt-2" required pattern="[A-Za-z0-9_-]{2,40}" maxLength={40} value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label>
 <label className="text-sm font-bold">Loại giảm<select className="input mt-2" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="PERCENT">Phần trăm (%)</option><option value="FIXED">Số tiền (VNĐ)</option></select></label>
 <label className="text-sm font-bold">Giá trị giảm<input className="input mt-2" type="number" required min={1} max={form.type==='PERCENT'?99:2147483647} value={form.value} onChange={e=>setForm({...form,value:Number(e.target.value)})}/></label>
 <label className="text-sm font-bold">Bắt đầu<input className="input mt-2" type="datetime-local" required value={form.startsAt} onChange={e=>setForm({...form,startsAt:e.target.value})}/></label>
 <label className="text-sm font-bold">Kết thúc<input className="input mt-2" type="datetime-local" required value={form.endsAt} onChange={e=>setForm({...form,endsAt:e.target.value})}/></label>
 <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/>Cho phép sử dụng</label>
 <div className="flex gap-2"><button className="btn-primary" disabled={saving || updatingStatus!==null}>{saving?'Đang lưu...':editing?'Lưu thay đổi':'Tạo mã'}</button>{editing && <button type="button" className="btn-secondary" onClick={()=>{setEditing(null);setForm(empty());}}>Hủy sửa</button>}</div>
 </form>
 {loading && <p>Đang tải...</p>}{error && <p role="alert">{error} <button onClick={load}>Thử lại</button></p>}
 <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead><tr>{['Mã','Mức giảm','Bắt đầu','Kết thúc','Trạng thái',''].map(x=><th className="p-4" key={x}>{x}</th>)}</tr></thead><tbody>
 {items.map(item=><tr key={item.id} className="border-t"><td className="p-4 font-bold">{item.code}</td><td className="p-4">{item.value.toLocaleString('vi-VN')}{item.type==='PERCENT'?'%':'đ'}</td><td className="p-4">{new Date(item.startsAt).toLocaleString('vi-VN')}</td><td className="p-4">{new Date(item.endsAt).toLocaleString('vi-VN')}</td><td className="p-4">{!item.active?'Đã tắt':Date.now()<Date.parse(item.startsAt)?'Chưa bắt đầu':Date.now()>=Date.parse(item.endsAt)?'Hết hạn':'Đang áp dụng'}<button type="button" role="switch" aria-checked={item.active} aria-label={'Cho phép sử dụng mã '+item.code} disabled={updatingStatus!==null || saving} onClick={()=>toggleStatus(item)} className="ml-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold text-slate-700 disabled:opacity-50"><span className={'h-2.5 w-2.5 rounded-full '+(item.active?'bg-emerald-500':'bg-slate-400')}/>{updatingStatus===item.id?'Đang lưu...':item.active?'Tắt mã':'Bật mã'}</button></td><td className="p-4"><button className="btn-secondary" onClick={()=>{setEditing(item.id);setForm({code:item.code,type:item.type,value:item.value,startsAt:localDate(item.startsAt),endsAt:localDate(item.endsAt),active:item.active});}}>Chỉnh sửa</button></td></tr>)}
 </tbody></table>{!loading && !error && !items.length && <p className="p-4">Chưa có mã giảm giá.</p>}</div>
 </div>;
}
