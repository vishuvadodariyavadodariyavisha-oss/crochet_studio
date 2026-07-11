import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/* ── Yarn Ball SVG ── */
const YarnBall = ({ size = 60, color = "#b57449" }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <circle cx="30" cy="30" r="26" stroke={color} strokeWidth="2" fill="none" />
    <ellipse cx="30" cy="30" rx="14" ry="26" stroke={color} strokeWidth="1.5" fill="none" />
    <ellipse cx="30" cy="30" rx="26" ry="10" stroke={color} strokeWidth="1.5" fill="none" />
    <path d="M8 20 Q30 28 52 20" stroke={color} strokeWidth="1.5" fill="none" />
    <path d="M8 40 Q30 32 52 40" stroke={color} strokeWidth="1.5" fill="none" />
  </svg>
);

/* ── Animated thread canvas ── */
function ThreadCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const brownThreads = ["#c4956a","#b57449","#a8836f","#8b5e3c","#c4a882","#d4b896","#9a7a5a","#8a9e7a"];
    const threads = Array.from({ length: 8 }, (_, i) => ({
      pts: Array.from({ length: 6 }, (_, j) => ({
        x: (window.innerWidth / 7) * j * (i % 2 === 0 ? 1.1 : 0.9),
        y: (window.innerHeight / 5) * (i * 0.6 + 1),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
      })),
      hue: brownThreads[i % brownThreads.length],
    }));
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      threads.forEach((t) => {
        t.pts.forEach((p) => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        });
        ctx.beginPath();
        ctx.moveTo(t.pts[0].x, t.pts[0].y);
        for (let i = 1; i < t.pts.length - 1; i++) {
          const cx = (t.pts[i].x + t.pts[i + 1].x) / 2;
          const cy = (t.pts[i].y + t.pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(t.pts[i].x, t.pts[i].y, cx, cy);
        }
        ctx.strokeStyle = t.hue;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.15;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:"fixed", top:0, left:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:0 }} />;
}

const marqueeItems = [
  "100% Handcrafted","Natural Fibers","Made with Love","Unique Pieces","Sustainable Craft","Custom Orders",
  "100% Handcrafted","Natural Fibers","Made with Love","Unique Pieces","Sustainable Craft","Custom Orders",
];

const placeholderColors = [
  "linear-gradient(135deg,#e8d5c4,#d4b896)",
  "linear-gradient(135deg,#ddd0c0,#c8a880)",
  "linear-gradient(135deg,#e4dbd0,#cbb898)",
  "linear-gradient(135deg,#f0e8dc,#dcc8a8)",
  "linear-gradient(135deg,#d8cfc4,#c4a87c)",
  "linear-gradient(135deg,#e0d4c4,#c8b090)",
  "linear-gradient(135deg,#dcd4c8,#c8b898)",
  "linear-gradient(135deg,#e8ddd0,#d4bc9c)",
];

const categoryAccents = ["#b57449", "#8a9e7a", "#7a8ea8"];

/* ── Inject keyframes + hover classes once ── */
if (typeof document !== "undefined" && !document.getElementById("hh-keyframes")) {
  const styleEl = document.createElement("style");
  styleEl.id = "hh-keyframes";
  styleEl.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Cormorant+Garamond:wght@300;400;500&family=Jost:wght@300;400;500&display=swap');
    @keyframes hhSpin       { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes hhFloat      { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-22px) rotate(8deg)} }
    @keyframes hhFadeUp     { to{opacity:1;transform:translateY(0)} }
    @keyframes hhMarquee    { from{transform:translateX(0)} to{transform:translateX(-50%)} }
    @keyframes hhCardReveal { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

    .hh-crochet-circle { position:absolute; border-radius:50%; z-index:1; border:2px solid rgba(181,116,73,0.3); animation:hhSpin linear infinite; }
    .hh-crochet-circle::before { content:''; position:absolute; inset:8px; border-radius:50%; border:1px dashed rgba(196,149,106,0.45); }
    .hh-crochet-circle::after  { content:''; position:absolute; inset:18px; border-radius:50%; border:1px solid rgba(139,94,60,0.35); }

    .hh-cat-card { border-radius:18px; overflow:hidden; cursor:pointer; background:white;
      transition:transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.3s;
      border:2px solid transparent; display:flex; flex-direction:column; height:100%; }
    .hh-cat-card:hover { transform:translateY(-8px); box-shadow:0 20px 50px rgba(92,61,46,0.2); border-color:rgba(181,116,73,0.4); }
    .hh-cat-card:hover .hh-cat-img  { transform:scale(1.06); }
    .hh-cat-card:hover .hh-cat-arrow { transform:translateX(4px); }

    .hh-prod-card { background:white; border-radius:18px; overflow:hidden; border:1.5px solid rgba(196,168,130,0.2);
      transition:all 0.4s cubic-bezier(0.16,1,0.3,1); animation:hhCardReveal 0.6s ease both; cursor:pointer; }
    .hh-prod-card:hover { transform:translateY(-6px); box-shadow:0 16px 40px rgba(92,61,46,0.15); border-color:rgba(181,116,73,0.4); }
    .hh-prod-card:hover .hh-prod-img { transform:scale(1.05); }

    .hh-add-btn:hover { background:linear-gradient(135deg,#b57449,#8b5e3c) !important; border-color:transparent !important; color:white !important; }
    .hh-promise-card:hover { transform:translateY(-6px); box-shadow:0 12px 35px rgba(92,61,46,0.15); }
    .hh-btn-primary:hover { transform:translateY(-3px); box-shadow:0 10px 35px rgba(181,116,73,0.5) !important; }

    @media(max-width:768px){
      .hh-cat-grid-3 { grid-template-columns:1fr !important; }
    }
    @media(max-width:1024px) and (min-width:769px){
      .hh-cat-grid-3 { grid-template-columns:repeat(2,1fr) !important; }
    }
  `;
  document.head.appendChild(styleEl);
}

/* ═══════════════════════════════════════
   HOME COMPONENT
═══════════════════════════════════════ */
export default function Home() {
  const navigate = useNavigate();
  const [products,   setProducts]   = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/home")
      .then((r) => r.json())
      .then((data) => {
        setCategories((data.categories || []).slice(0, 3));
        setProducts((data.products   || []).slice(0, 8));
      })
      .catch(() => {
        setCategories([
          { _id:"c1", categoryName:"Bags & Totes", image:null, description:"24 items" },
          { _id:"c2", categoryName:"Home Decor",   image:null, description:"18 items" },
          { _id:"c3", categoryName:"Keychains",    image:null, description:"32 items" },
        ]);
        setProducts([
          { _id:"1", productName:"Boho Tote Bag",       basePrice:1200, discount:15, images:[], categoryId:{categoryName:"Bags"} },
          { _id:"2", productName:"Macramé Wall Hanging", basePrice:850,  discount:0,  images:[], categoryId:{categoryName:"Home Decor"} },
          { _id:"3", productName:"Daisy Keychain",       basePrice:250,  discount:20, images:[], categoryId:{categoryName:"Keychains"} },
          { _id:"4", productName:"Market Basket",        basePrice:1500, discount:10, images:[], categoryId:{categoryName:"Bags"} },
          { _id:"5", productName:"Cushion Cover",        basePrice:700,  discount:0,  images:[], categoryId:{categoryName:"Home Decor"} },
          { _id:"6", productName:"Moon Keychain",        basePrice:300,  discount:0,  images:[], categoryId:{categoryName:"Keychains"} },
          { _id:"7", productName:"Granny Square Bag",    basePrice:950,  discount:25, images:[], categoryId:{categoryName:"Bags"} },
          { _id:"8", productName:"Plant Hanger",         basePrice:550,  discount:0,  images:[], categoryId:{categoryName:"Home Decor"} },
        ]);
      });
  }, []);

  const calcDiscountedPrice = (base, discount) =>
    discount > 0 ? Math.round(base - (base * discount) / 100) : null;

  const imgUrl = (path) =>
    path ? `http://localhost:5000/${path.replace(/\\/g, "/")}` : null;

  // ✅ FIX: Category click kare tyare directly filtered page par navigate karo
  const handleCategoryClick = (categoryId) => {
    navigate(`/Product?category=${categoryId}`);
  };

  const S = {
    page: { background:"#faf6f0", fontFamily:"'Jost',sans-serif", color:"#2c2420", overflowX:"hidden" },

    /* HERO */
    hero: { position:"relative", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", backgroundImage:'url("../images/cover.jpg")', backgroundSize:"cover", backgroundPosition:"center" },
    heroOverlay: { position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(181,116,73,0.22) 0%,rgba(196,149,106,0.18) 40%,rgba(92,61,46,0.15) 100%)", zIndex:1 },
    cc1: { width:"320px", height:"320px", top:"-90px", right:"-90px", animationDuration:"60s" },
    cc2: { width:"200px", height:"200px", bottom:"80px", left:"-50px", animationDuration:"45s", animationDirection:"reverse" },
    cc3: { width:"130px", height:"130px", top:"40%", right:"10%", animationDuration:"30s" },
    yf: (b,l,t,r,dur,delay) => ({ position:"absolute", zIndex:2, animation:"hhFloat ease-in-out infinite", animationDuration:dur, animationDelay:delay||"0s", ...(b?{bottom:b}:{}), ...(l?{left:l}:{}), ...(t?{top:t}:{}), ...(r?{right:r}:{}) }),
    heroContent: { position:"relative", zIndex:3, textAlign:"center", padding:"2rem", opacity:0, transform:"translateY(50px)", animation:"hhFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.8s forwards" },
    eyebrow: { fontFamily:"'Jost',sans-serif", fontSize:"0.75rem", fontWeight:500, letterSpacing:"0.3em", textTransform:"uppercase", display:"flex", alignItems:"center", justifyContent:"center", gap:"12px", marginBottom:"1rem", background:"linear-gradient(90deg,#b57449,#c4956a)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" },
    eyebrowLine: { width:"40px", height:"1px", background:"linear-gradient(90deg,#b57449,#c4956a)", opacity:0.6 },
    heroTitle: { fontFamily:"'Playfair Display',serif", fontSize:"clamp(2.8rem,6vw,5.5rem)", fontWeight:700, lineHeight:1.1, color:"#2c2420", marginBottom:"1.5rem" },
    heroTitleEm: { fontStyle:"italic", background:"linear-gradient(135deg,#b57449,#8b5e3c,#5c3d2e)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" },
    heroSub: { fontFamily:"'Cormorant Garamond',serif", fontSize:"1.25rem", fontWeight:300, color:"#6b5240", maxWidth:"500px", margin:"0 auto 2.5rem", lineHeight:1.7 },
    ctaGroup: { display:"flex", gap:"1rem", justifyContent:"center", flexWrap:"wrap" },
    btnPrimary: { background:"linear-gradient(135deg,#b57449,#8b5e3c)", color:"white", padding:"14px 36px", borderRadius:"50px", border:"none", fontFamily:"'Jost',sans-serif", fontSize:"0.85rem", fontWeight:500, letterSpacing:"0.15em", textTransform:"uppercase", cursor:"pointer", transition:"all 0.3s ease", textDecoration:"none", display:"inline-block", boxShadow:"0 4px 20px rgba(181,116,73,0.35)" },
    btnOutline: { background:"transparent", color:"#2c2420", padding:"14px 36px", borderRadius:"50px", border:"1.5px solid rgba(181,116,73,0.5)", fontFamily:"'Jost',sans-serif", fontSize:"0.85rem", fontWeight:500, letterSpacing:"0.15em", textTransform:"uppercase", cursor:"pointer", transition:"all 0.3s ease", textDecoration:"none", display:"inline-block" },
    stats: { display:"flex", gap:"3rem", justifyContent:"center", marginTop:"4rem", paddingTop:"2rem", borderTop:"1px solid rgba(181,116,73,0.3)", animation:"hhFadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 1.4s both" },
    stat: { textAlign:"center" },
    statNum: { fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:700, display:"block", background:"linear-gradient(135deg,#b57449,#8b5e3c)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" },
    statLabel: { fontSize:"0.72rem", letterSpacing:"0.15em", textTransform:"uppercase", color:"#9a8070", marginTop:"4px" },

    /* MARQUEE */
    marquee: { background:"#5c3d2e", padding:"14px 0", overflow:"hidden", position:"relative", zIndex:2 },
    marqueeInner: { display:"flex", animation:"hhMarquee 25s linear infinite", whiteSpace:"nowrap" },
    marqueeItem: { fontFamily:"'Cormorant Garamond',serif", fontSize:"1.05rem", fontStyle:"italic", padding:"0 2rem", display:"flex", alignItems:"center", gap:"1rem", flexShrink:0, color:"#e8c9b0" },
    mdot: { width:"6px", height:"6px", borderRadius:"50%", flexShrink:0, background:"linear-gradient(135deg,#b57449,#c4956a)", display:"inline-block" },

    /* SECTION */
    section: (bg) => ({ padding:"7rem 0 5rem", position:"relative", zIndex:2, background:bg||"#faf6f0" }),
    sectionHeader: { textAlign:"center", marginBottom:"4rem" },
    sectionTag: { fontSize:"0.72rem", letterSpacing:"0.3em", textTransform:"uppercase", fontFamily:"'Jost',sans-serif", fontWeight:500, background:"linear-gradient(90deg,#b57449,#c4956a)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" },
    sectionTitle: { fontFamily:"'Playfair Display',serif", fontSize:"clamp(2rem,4vw,3rem)", fontWeight:600, color:"#2c2420", margin:"0.5rem 0 0", lineHeight:1.2 },

    catGrid: {
      display:"grid",
      gridTemplateColumns:"repeat(3,1fr)",
      gap:"1.5rem",
      maxWidth:"1200px",
      margin:"0 auto",
      padding:"0 2rem",
      alignItems:"stretch",
    },

    /* ✅ Category card — cursor pointer, no Link wrapper needed */
    catCard: { textDecoration:"none", display:"block", height:"100%", cursor:"pointer" },

    catImgBox: {
      width:"100%",
      height:"260px",
      overflow:"hidden",
      position:"relative",
      background:"#f0e8dc",
      flexShrink:0,
    },
    catImg: { width:"100%", height:"100%", objectFit:"cover", display:"block", transition:"transform 0.6s cubic-bezier(0.16,1,0.3,1)" },
    catImgOverlay: { position:"absolute", inset:0, background:"linear-gradient(to bottom,transparent 55%,rgba(44,28,16,0.1))", pointerEvents:"none" },
    catInfo: { padding:"1.1rem 1.25rem 1.35rem", display:"flex", alignItems:"center", justifyContent:"space-between", flexGrow:1 },
    catName: { fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:600, color:"#2c2420", marginBottom:"3px" },
    catCount: { fontSize:"0.76rem", color:"#a08870", letterSpacing:"0.06em" },
    catArrow: (accent) => ({ width:"32px", height:"32px", borderRadius:"50%", color:"white", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:"0.95rem", flexShrink:0, transition:"transform 0.3s ease", background:accent }),

    /* PRODUCTS */
    productsSection: { padding:"5rem 0 7rem", position:"relative", zIndex:2, background:"#fff8f0" },
    productsBorderTop: { position:"absolute", top:0, left:0, right:0, height:"3px", background:"linear-gradient(90deg,#b57449,#c4956a,#c4a882,#d4b896)" },
    productsGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"2rem", maxWidth:"1200px", margin:"0 auto", padding:"0 2rem" },
    prodCard: (delay) => ({ background:"white", borderRadius:"18px", overflow:"hidden", border:"1.5px solid rgba(196,168,130,0.2)", transition:"all 0.4s cubic-bezier(0.16,1,0.3,1)", animation:"hhCardReveal 0.6s ease both", animationDelay:`${delay}s` }),
    prodImgWrap: { height:"240px", overflow:"hidden", position:"relative" },
    prodImg: { width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.5s ease", display:"block" },
    prodPlaceholder: (bg) => ({ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:bg }),
    badge: (isNew) => ({ position:"absolute", top:"12px", left:"12px", color:"white", fontSize:"0.68rem", fontWeight:600, letterSpacing:"0.1em", padding:"4px 10px", borderRadius:"20px", textTransform:"uppercase", background: isNew ? "linear-gradient(135deg,#b57449,#8b5e3c)" : "linear-gradient(135deg,#8a9e7a,#6a8a6a)" }),
    prodInfo: { padding:"1.25rem" },
    prodCat: { fontSize:"0.72rem", textTransform:"uppercase", letterSpacing:"0.15em", color:"#b57449", marginBottom:"0.4rem" },
    prodName: { fontFamily:"'Playfair Display',serif", fontSize:"1.05rem", fontWeight:600, color:"#2c2420", marginBottom:"0.75rem", lineHeight:1.35 },
    prodPriceRow: { display:"flex", alignItems:"center", justifyContent:"space-between" },
    prodPrice: { fontFamily:"'Jost',sans-serif", fontSize:"1.1rem", fontWeight:500, color:"#2c2420" },
    original: { fontSize:"0.85rem", color:"#aaa", textDecoration:"line-through", marginRight:"6px" },
    discounted: { fontWeight:700, color:"#b57449" },
    addBtn: { width:"36px", height:"36px", borderRadius:"50%", border:"1.5px solid #d4b896", background:"transparent", cursor:"pointer", fontSize:"1.2rem", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s ease", color:"#2c2420" },
    viewAll: { textAlign:"center", marginTop:"3rem" },

    /* SALE */
    saleSection: { position:"relative", zIndex:2, padding:"5rem 2rem", overflow:"hidden" },
    saleInner: { maxWidth:"1200px", margin:"0 auto", borderRadius:"28px", padding:"5rem 3rem", textAlign:"center", position:"relative", overflow:"hidden", background:"linear-gradient(135deg,#2c1a0e 0%,#3d2510 50%,#1a0e06 100%)" },
    saleTag: { display:"inline-block", background:"linear-gradient(135deg,#b57449,#c4956a)", color:"white", fontSize:"0.72rem", letterSpacing:"0.25em", textTransform:"uppercase", padding:"6px 18px", borderRadius:"30px", marginBottom:"1.5rem", fontFamily:"'Jost',sans-serif" },
    saleTitle: { fontFamily:"'Playfair Display',serif", fontSize:"clamp(2.5rem,5vw,4rem)", fontWeight:700, color:"white", lineHeight:1.1 },
    saleTitleSpan: { background:"linear-gradient(135deg,#b57449,#c4956a,#c4a882)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" },
    saleSub: { fontFamily:"'Cormorant Garamond',serif", color:"rgba(255,255,255,0.65)", fontSize:"1.15rem", margin:"1rem 0 2.5rem" },

    /* PROMISE */
    promiseGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"2rem", maxWidth:"960px", margin:"3rem auto 0" },
    promiseCard: { textAlign:"center", background:"white", borderRadius:"20px", padding:"2.5rem 1.5rem", transition:"transform 0.3s ease, box-shadow 0.3s ease", border:"2px solid transparent" },
    promiseIcon: { fontSize:"2.8rem", marginBottom:"1rem", display:"block" },
    promiseTitle: { fontFamily:"'Playfair Display',serif", fontSize:"1.05rem", fontWeight:600, color:"#2c2420", marginBottom:"0.5rem" },
    promiseText: { fontSize:"0.85rem", color:"#9a8070", lineHeight:1.6 },
  };

  return (
    <div style={S.page}>
      <ThreadCanvas />

      {/* ── HERO ── */}
      <section style={S.hero}>
        <div style={S.heroOverlay} />
        <div className="hh-crochet-circle" style={S.cc1} />
        <div className="hh-crochet-circle" style={S.cc2} />
        <div className="hh-crochet-circle" style={S.cc3} />
        <div style={S.yf("15%","8%",null,null,"6s","0s")}><YarnBall size={80} color="#b57449" /></div>
        <div style={S.yf(null,null,"20%","14%","8s","2s")}><YarnBall size={55} color="#c4956a" /></div>
        <div style={S.yf("35%",null,null,"5%","7s","1s")}><YarnBall size={45} color="#8b5e3c" /></div>

        <div style={S.heroContent}>
          <div style={S.eyebrow}>
            <span style={S.eyebrowLine} />✦ Handcrafted with Love ✦<span style={S.eyebrowLine} />
          </div>
          <h1 style={S.heroTitle}>
            Beautiful <em style={S.heroTitleEm}>Crochet</em><br />Creations
          </h1>
          <p style={S.heroSub}>
            Each piece is carefully woven by hand using natural fibers —<br />
            no two are ever exactly the same.
          </p>
          <div style={S.ctaGroup}>
            <Link to="/Product" style={S.btnPrimary} className="hh-btn-primary">Shop Collection</Link>
            <Link to="/AboutUs"   style={S.btnOutline}>Our Story</Link>
          </div>
          <div style={S.stats}>
            {[["500+","Happy Customers"],["100%","Handmade"],["Natural","Fibers Only"]].map(([num,label]) => (
              <div key={label} style={S.stat}>
                <span style={S.statNum}>{num}</span>
                <span style={S.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div style={S.marquee}>
        <div style={S.marqueeInner}>
          {marqueeItems.map((item, i) => (
            <span style={S.marqueeItem} key={i}>{item}<span style={S.mdot} /></span>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          CATEGORIES
      ══════════════════════════════════════ */}
      <section style={S.section("#faf6f0")}>
        <div style={S.sectionHeader}>
          <p style={S.sectionTag}>Browse</p>
          <h2 style={S.sectionTitle}>Shop by Category</h2>
        </div>

        <div style={S.catGrid} className="hh-cat-grid-3">
          {categories.map((cat, i) => {
            const accent   = categoryAccents[i % categoryAccents.length];
            const imageUrl = imgUrl(cat.image);
            return (
              // ✅ FIX: Link ni jagah div with onClick — directly filtered Product page par jaay
              <div
                key={cat._id}
                style={S.catCard}
                onClick={() => handleCategoryClick(cat._id)}
              >
                <div className="hh-cat-card">
                  <div style={S.catImgBox}>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={cat.categoryName}
                        style={S.catImg}
                        className="hh-cat-img"
                      />
                    ) : (
                      <div style={{ width:"100%", height:"100%", background:placeholderColors[i % placeholderColors.length], display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <YarnBall size={70} color={accent} />
                      </div>
                    )}
                    <div style={S.catImgOverlay} />
                  </div>

                  <div style={S.catInfo}>
                    <div>
                      <p style={S.catName}>{cat.categoryName}</p>
                      <p style={S.catCount}>{cat.description || "Handcrafted items"}</p>
                    </div>
                    <span style={S.catArrow(accent)} className="hh-cat-arrow">→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════
          PRODUCTS
      ══════════════════════════════════════ */}
      <section style={{ ...S.productsSection, position:"relative" }}>
        <div style={S.productsBorderTop} />
        <div style={S.sectionHeader}>
          <p style={S.sectionTag}>New Arrivals</p>
          <h2 style={S.sectionTitle}>Fresh From the Hook</h2>
        </div>

        {products.length === 0 ? (
          <p style={{ textAlign:"center", color:"#a08870", fontFamily:"'Cormorant Garamond',serif", fontSize:"1.2rem", padding:"3rem" }}>
            No products found.
          </p>
        ) : (
          <div style={S.productsGrid}>
            {products.map((p, idx) => {
              const discounted = calcDiscountedPrice(p.basePrice, p.discount);
              const imageUrl   = p.images && p.images[0] ? imgUrl(p.images[0]) : null;
              return (
                <div
                  key={p._id}
                  className="hh-prod-card"
                  style={S.prodCard(idx * 0.08)}
                  onClick={() => navigate(`/productDetail/${p._id}`)}
                >
                  <div style={S.prodImgWrap}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={p.productName} style={S.prodImg} className="hh-prod-img" />
                    ) : (
                      <div style={S.prodPlaceholder(placeholderColors[idx % placeholderColors.length])}>
                        <YarnBall size={70} color="rgba(181,116,73,0.6)" />
                      </div>
                    )}
                    {p.discount > 0 && <span style={S.badge(false)}>-{p.discount}%</span>}
                    {idx === 0   && <span style={{ ...S.badge(true), left: p.discount > 0 ? "85px" : "12px" }}>New</span>}
                  </div>

                  <div style={S.prodInfo}>
                    <p style={S.prodCat}>{p.categoryId?.categoryName || "Crochet"}</p>
                    <p style={S.prodName}>{p.productName}</p>
                    <div style={S.prodPriceRow}>
                      <div style={S.prodPrice}>
                        {discounted ? (
                          <><span style={S.original}>₹{p.basePrice}</span><span style={S.discounted}>₹{discounted}</span></>
                        ) : (
                          <span>₹{p.basePrice}</span>
                        )}
                      </div>
                      <button
                        style={S.addBtn}
                        className="hh-add-btn"
                        onClick={(e) => { e.stopPropagation(); navigate(`/productDetail/${p._id}`); }}
                      >+</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={S.viewAll}>
          <Link to="/Product" style={S.btnPrimary} className="hh-btn-primary">View All Products</Link>
        </div>
      </section>

      {/* ── SALE BANNER ── */}
      <section style={S.saleSection}>
        <div style={S.saleInner}>
          <span style={S.saleTag}>Limited Time Offer</span>
          <h2 style={S.saleTitle}>
            Up to <span style={S.saleTitleSpan}>40% OFF</span><br />Handcrafted Sale
          </h2>
          <p style={S.saleSub}>Seasonal discounts on our most-loved crochet pieces.</p>
          <Link to="/Product" style={S.btnPrimary} className="hh-btn-primary">Shop the Sale</Link>
        </div>
      </section>

      {/* ── PROMISE CARDS ── */}
      <section style={S.section("#faf6f0")}>
        <div style={S.sectionHeader}>
          <p style={S.sectionTag}>Why Choose Us</p>
          <h2 style={S.sectionTitle}>The Craft Promise</h2>
        </div>
        <div style={S.promiseGrid}>
          {[
            { icon:"🧶", title:"100% Handmade",  text:"Every stitch placed by hand with care and intention." },
            { icon:"🌿", title:"Natural Fibers",  text:"We use only cotton, wool, and jute — never synthetics." },
            { icon:"✨", title:"Unique Pieces",   text:"No two items are identical. Each is a one-of-a-kind creation." },
            { icon:"📦", title:"Custom Orders",   text:"Want a specific color or size? We'll craft it just for you." },
          ].map((item, i) => (
            <div key={i} className="hh-promise-card" style={S.promiseCard}>
              <span style={S.promiseIcon}>{item.icon}</span>
              <p style={S.promiseTitle}>{item.title}</p>
              <p style={S.promiseText}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}