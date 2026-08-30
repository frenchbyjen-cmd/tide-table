import React, {useEffect, useMemo, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import QRCode from "qrcode";
import {restaurant, categories, menu, translations} from "./config";
import {api} from "./api";
import "./styles.css";

const money = n => `${n} ${restaurant.currency}`;
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

function useTable(){
  return new URLSearchParams(window.location.search).get("table") || "7";
}

function App(){
  if (window.location.pathname === "/staff") return <Staff />;
  if (window.location.pathname === "/demo-qr") return <DemoQR />;
  return <Customer />;
}

function DemoQR(){
  const [src,setSrc]=useState("");
  const url = `${window.location.origin}/?table=7`;
  useEffect(()=>{ QRCode.toDataURL(url,{width:460,margin:2}).then(setSrc); },[]);
  return <div className="qr-page">
    <div className="qr-card">
      <div className="eyebrow">TIDE TABLE</div>
      <h1>TABLE 7</h1>
      <p>SCAN TO ORDER</p>
      {src && <img src={src} alt="QR Table 7" />}
      <small>{url}</small>
    </div>
  </div>
}

function Customer(){
  const table = useTable();
  const [lang,setLang]=useState(localStorage.getItem("tt-lang") || "");
  const [started,setStarted]=useState(!!lang);
  const [category,setCategory]=useState("Breakfast");
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState(null);
  const [chosenExtras,setChosenExtras]=useState([]);
  const [cart,setCart]=useState([]);
  const [cartOpen,setCartOpen]=useState(false);
  const [sent,setSent]=useState(false);
  const [hasOrdered,setHasOrdered]=useState(localStorage.getItem(`tt-ordered-${table}`)==="1");
  const [requestOpen,setRequestOpen]=useState(false);
  const [billOpen,setBillOpen]=useState(false);
  const [toast,setToast]=useState("");
  const t = translations[lang || "en"];

  useEffect(()=>{ if(lang) localStorage.setItem("tt-lang",lang); },[lang]);

  const filtered = useMemo(()=>menu.filter(x =>
    x.category===category && (x.name+x.description).toLowerCase().includes(query.toLowerCase())
  ),[category,query]);

  const cartTotal = cart.reduce((s,i)=>s+i.total*i.qty,0);

  function addItem(){
    const extras = selected.extras.filter(e=>chosenExtras.includes(e.name));
    const total = selected.price + extras.reduce((s,e)=>s+e.price,0);
    setCart(c=>[...c,{key:uid(),productId:selected.id,name:selected.name,price:selected.price,extras,total,qty:1}]);
    setSelected(null); setChosenExtras([]); setCartOpen(true);
  }

  async function sendOrder(){
    const payload = {
      id:uid(), table, type:hasOrdered ? "additional" : "initial",
      items:cart, total:cartTotal,
      extrasRevenue:cart.reduce((s,i)=>s+i.extras.reduce((a,e)=>a+e.price,0)*i.qty,0),
      extrasCount:cart.reduce((s,i)=>s+i.extras.length*i.qty,0),
      status:"new", createdAt:new Date().toISOString()
    };
    try{
      await api("orders",{method:"POST",body:JSON.stringify(payload)});
      setSent(true); setCart([]); setCartOpen(false);
      setHasOrdered(true); localStorage.setItem(`tt-ordered-${table}`,"1");
    }catch(e){
      alert(`Could not send the order.\n\n${e.message}\n\nOpen /.netlify/functions/health to diagnose.`);
    }
  }

  async function sendRequest(reason){
    try{
      await api("requests",{method:"POST",body:JSON.stringify({id:uid(),kind:"waiter",table,reason,status:"new",createdAt:new Date().toISOString()})});
      setRequestOpen(false); flash("Request sent");
    }catch(e){ alert(`Could not send request.\n\n${e.message}`); }
  }

  async function sendBill(){
    try{
      await api("requests",{method:"POST",body:JSON.stringify({id:uid(),kind:"bill",table,reason:"Bill requested",status:"new",createdAt:new Date().toISOString()})});
      setBillOpen(false); flash("Bill request sent");
    }catch(e){ alert(`Could not request bill.\n\n${e.message}`); }
  }
  function flash(m){setToast(m);setTimeout(()=>setToast(""),2200)}

  if(!started) return <Welcome table={table} lang={lang} setLang={setLang} onStart={()=>setStarted(true)} />;

  if(sent) return <div className="success-screen">
    <div className="success-mark">✓</div>
    <h1>{t.orderSent}</h1>
    <p>{t.received}</p>
    <div className="table-pill">{t.table} {table}</div>
    <button className="primary" onClick={()=>setSent(false)}>{t.back}</button>
    <div className="quick-actions">
      <button onClick={()=>{setSent(false);setRequestOpen(true)}}>{t.waiter}</button>
      <button onClick={()=>{setSent(false);setBillOpen(true)}}>{t.bill}</button>
    </div>
  </div>;

  return <div className="app-shell">
    <header className="customer-head">
      <div><div className="brand">{restaurant.name}</div><small>{restaurant.subtitle}</small></div>
      <div className="table-pill">{t.table} {table}</div>
    </header>

    <section className="hero" style={{backgroundImage:`linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.6)),url("${restaurant.heroImage}")`}}>
      <div><span>Fresh • Local • Easy</span><h1>Good food.<br/>Zero waiting.</h1></div>
    </section>

    {hasOrdered && <div className="after-order">
      <strong>{t.table} {table}</strong>
      <button onClick={()=>window.scrollTo({top:300,behavior:"smooth"})}>＋ {t.orderMore}</button>
      <button onClick={()=>setRequestOpen(true)}>⌁ {t.waiter}</button>
      <button onClick={()=>setBillOpen(true)}>⌑ {t.bill}</button>
    </div>}

    <div className="search-wrap"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}/></div>
    <nav className="cats">{categories.map(c=><button className={category===c?"active":""} key={c} onClick={()=>setCategory(c)}>{c}</button>)}</nav>

    <main className="menu-grid">
      {filtered.map(item=><article className="dish" key={item.id} onClick={()=>{setSelected(item);setChosenExtras([])}}>
        {item.image ? <img src={item.image} alt={item.name}/> : <div className="image-fallback">TIDE</div>}
        <div className="dish-body">
          <div className="dish-top"><h3>{item.name}</h3><strong>{money(item.price)}</strong></div>
          <p>{item.description}</p>
          <button className="plus">＋</button>
        </div>
      </article>)}
    </main>

    {cart.length>0 && <button className="cart-fab" onClick={()=>setCartOpen(true)}>
      <span>{cart.length}</span> {t.yourOrder} <strong>{money(cartTotal)}</strong>
    </button>}

    {selected && <Modal onClose={()=>setSelected(null)}>
      <div className="product-modal">
        {selected.image && <img src={selected.image}/>}
        <h2>{selected.name}</h2><p>{selected.description}</p>
        <div className="price-line"><strong>{money(selected.price)}</strong></div>
        {selected.extras.length>0 && <>
          <h4>{t.extras}</h4>
          <div className="extras">{selected.extras.map(ex=><label key={ex.name}>
            <input type="checkbox" checked={chosenExtras.includes(ex.name)}
              onChange={()=>setChosenExtras(x=>x.includes(ex.name)?x.filter(n=>n!==ex.name):[...x,ex.name])}/>
            <span>{ex.name}</span><strong>+{money(ex.price)}</strong>
          </label>)}</div>
        </>}
        <button className="primary" onClick={addItem}>{t.add} · {money(selected.price + selected.extras.filter(e=>chosenExtras.includes(e.name)).reduce((s,e)=>s+e.price,0))}</button>
      </div>
    </Modal>}

    {cartOpen && <Modal onClose={()=>setCartOpen(false)}>
      <div className="cart">
        <div className="eyebrow">{t.table} {table}</div><h2>{t.yourOrder}</h2>
        {cart.map((item,i)=><div className="cart-row" key={item.key}>
          <div><strong>{item.name}</strong>{item.extras.map(e=><small key={e.name}>+ {e.name} ({money(e.price)})</small>)}</div>
          <strong>{money(item.total)}</strong>
          <button className="remove" onClick={()=>setCart(c=>c.filter(x=>x.key!==item.key))}>×</button>
        </div>)}
        <div className="cart-total"><span>{t.total}</span><strong>{money(cartTotal)}</strong></div>
        <p className="muted">Your order will be sent directly to the restaurant.</p>
        <button className="primary" disabled={!cart.length} onClick={sendOrder}>{t.send}</button>
      </div>
    </Modal>}

    {requestOpen && <Modal onClose={()=>setRequestOpen(false)}>
      <h2>{t.waiter}</h2><div className="request-grid">
        {[t.assistance,t.water,t.cutlery,t.other].map(r=><button key={r} onClick={()=>sendRequest(r)}>{r}</button>)}
      </div>
    </Modal>}

    {billOpen && <Modal onClose={()=>setBillOpen(false)}>
      <h2>{t.bill}</h2><p>{t.billConfirm} {t.table} {table}?</p>
      <button className="primary" onClick={sendBill}>{t.confirm}</button>
      <button className="secondary" onClick={()=>setBillOpen(false)}>{t.cancel}</button>
    </Modal>}

    {toast && <div className="toast">{toast}</div>}
  </div>
}

function Welcome({table,lang,setLang,onStart}){
  return <div className="welcome" style={{backgroundImage:`linear-gradient(180deg,rgba(18,20,18,.15),rgba(18,20,18,.85)),url("${restaurant.heroImage}")`}}>
    <div className="welcome-inner">
      <div className="eyebrow">{restaurant.subtitle}</div>
      <h1>{restaurant.name}</h1>
      <div className="table-outline">TABLE {table}</div>
      <p>Scan. Order. Enjoy.</p>
      <div className="language-row">
        {["en","fr","es"].map(x=><button className={lang===x?"selected":""} key={x} onClick={()=>setLang(x)}>{x==="en"?"ENGLISH":x==="fr"?"FRANÇAIS":"ESPAÑOL"}</button>)}
      </div>
      <button className="primary light" disabled={!lang} onClick={onStart}>{translations[lang||"en"].viewMenu}</button>
    </div>
  </div>
}

function Modal({children,onClose}){
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={e=>e.stopPropagation()}>
      <button className="modal-x" onClick={onClose}>×</button>{children}
    </div>
  </div>
}

function Staff(){
  const [authed,setAuthed]=useState(sessionStorage.getItem("tt-staff")==="1");
  const [pin,setPin]=useState("");
  const [orders,setOrders]=useState([]);
  const [requests,setRequests]=useState([]);
  const [sound,setSound]=useState(false);
  const [error,setError]=useState("");
  const previous = useRef(0);

  async function load(){
    try{
      const [o,r]=await Promise.all([api("orders"),api("requests")]);
      if(sound && previous.current && o.orders.length>previous.current){
        try{ const ctx=new AudioContext(); const osc=ctx.createOscillator(); const gain=ctx.createGain(); osc.frequency.value=650; gain.gain.value=.035; osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.18);}catch{}
      }
      previous.current=o.orders.length;
      setOrders(o.orders||[]);setRequests(r.requests||[]);setError("");
    }catch(e){setError("Backend unavailable. Deploy on Netlify to enable shared live orders.");}
  }
  useEffect(()=>{ if(!authed)return;load();const id=setInterval(load,2000);return()=>clearInterval(id)},[authed,sound]);

  async function patchOrder(id,status){
    await api("orders",{method:"PUT",body:JSON.stringify({id,status})});load();
  }
  async function patchRequest(id){
    await api("requests",{method:"PUT",body:JSON.stringify({id,status:"done"})});load();
  }
  async function reset(){
    if(!confirm("Reset all demo orders and requests?"))return;
    await Promise.all([api("orders",{method:"DELETE"}),api("requests",{method:"DELETE"})]);load();
  }
  async function testOrder(){
    const payload={id:uid(),table:"7",type:"initial",items:[{key:uid(),name:"Chicken Burger",price:85,total:135,qty:1,extras:[{name:"Cheese",price:10},{name:"French fries",price:25},{name:"Soft drink",price:15}]}],total:135,extrasRevenue:50,extrasCount:3,status:"new",createdAt:new Date().toISOString()};
    await api("orders",{method:"POST",body:JSON.stringify(payload)});load();
  }

  if(!authed)return <div className="staff-login">
    <div className="staff-login-card"><div className="eyebrow">{restaurant.name}</div><h1>STAFF</h1><p>Enter demo PIN</p>
    <input inputMode="numeric" value={pin} onChange={e=>setPin(e.target.value)} placeholder="PIN"/>
    <button className="primary" onClick={()=>{if(pin===restaurant.staffPin){sessionStorage.setItem("tt-staff","1");setAuthed(true)}else alert("Wrong PIN")}}>Open live orders</button></div>
  </div>;

  const counts = s=>orders.filter(o=>o.status===s).length;
  const todayOrders=orders;
  const revenue=todayOrders.reduce((s,o)=>s+o.total,0);
  const extrasRevenue=todayOrders.reduce((s,o)=>s+(o.extrasRevenue||0),0);
  const extrasCount=todayOrders.reduce((s,o)=>s+(o.extrasCount||0),0);
  const activeReq=requests.filter(r=>r.status!=="done");

  return <div className="staff">
    <header className="staff-head"><div><div className="eyebrow">{restaurant.name}</div><h1>LIVE ORDERS</h1></div>
      <div className="staff-actions"><button onClick={()=>setSound(!sound)}>{sound?"🔊 Sound on":"🔈 Enable sound"}</button><button onClick={testOrder}>Test order</button><button onClick={reset}>Reset demo</button></div>
    </header>
    {error&&<div className="backend-error">{error}</div>}
    <section className="status-grid">
      {["new","preparing","ready","served"].map(s=><div key={s}><span>{s}</span><strong>{counts(s)}</strong></div>)}
    </section>

    <section className="staff-layout">
      <div>
        <h2>Orders</h2>
        <div className="orders">
          {[...orders].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(o=><article className={`order-card ${o.status}`} key={o.id}>
            <div className="order-top"><div><span className="badge">{o.type==="additional"?"ADDITIONAL ORDER":"ORDER"}</span><h3>TABLE {o.table}</h3></div><time>{new Date(o.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time></div>
            {o.items.map(i=><div className="order-item" key={i.key}><strong>{i.qty} × {i.name}</strong>{i.extras?.map(e=><small key={e.name}>+ {e.name}</small>)}</div>)}
            <div className="order-total"><span>TOTAL</span><strong>{money(o.total)}</strong></div>
            {o.status==="new"&&<button className="primary" onClick={()=>patchOrder(o.id,"preparing")}>ACCEPT ORDER</button>}
            {o.status==="preparing"&&<button className="primary" onClick={()=>patchOrder(o.id,"ready")}>MARK AS READY</button>}
            {o.status==="ready"&&<button className="primary" onClick={()=>patchOrder(o.id,"served")}>MARK AS SERVED</button>}
            {o.status==="served"&&<div className="served-label">SERVED ✓</div>}
          </article>)}
          {!orders.length&&<div className="empty">No orders yet. Scan Table 7 or generate a test order.</div>}
        </div>
      </div>

      <aside>
        <h2>Guest requests</h2>
        <div className="requests">
          {activeReq.map(r=><article className={`request-card ${r.kind}`} key={r.id}><span>{r.kind==="bill"?"BILL REQUESTED":"WAITER REQUEST"}</span><h3>TABLE {r.table}</h3><p>{r.reason}</p><button onClick={()=>patchRequest(r.id)}>DONE</button></article>)}
          {!activeReq.length&&<div className="empty">No active requests.</div>}
        </div>
      </aside>
    </section>

    <section className="analytics"><h2>TODAY</h2><div className="analytics-grid">
      <div><span>Orders</span><strong>{todayOrders.length}</strong></div>
      <div><span>Revenue</span><strong>{money(revenue)}</strong></div>
      <div><span>Average order</span><strong>{money(todayOrders.length?Math.round(revenue/todayOrders.length):0)}</strong></div>
      <div><span>Extras sold</span><strong>{extrasCount}</strong></div>
      <div className="highlight"><span>Extras revenue</span><strong>{money(extrasRevenue)}</strong></div>
    </div></section>
  </div>
}

createRoot(document.getElementById("root")).render(<App/>);
