import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Authors with realistic international names
const authors = [
  {
    name: 'Marcus Webb',
    slug: 'marcus-webb',
    role: 'Finds Editorial Team',
    bio: 'Marcus is a classic car enthusiast and automotive journalist with over 15 years of experience covering European car culture. He writes for Finds, a BetterQA venture.',
    avatar: null,
    linkedIn: 'https://linkedin.com/company/betterqa',
    twitter: null,
  },
  {
    name: 'Elena Vasquez',
    slug: 'elena-vasquez',
    role: 'Market Analyst at Finds',
    bio: 'Elena specializes in classic car valuations and market trends across Europe. She brings data-driven insights to help collectors make informed decisions.',
    avatar: null,
    linkedIn: 'https://linkedin.com/company/betterqa',
    twitter: null,
  },
  {
    name: 'Thomas Brenner',
    slug: 'thomas-brenner',
    role: 'Restoration Specialist',
    bio: 'A former workshop owner with 20+ years restoring European classics, Thomas now advises Finds on vehicle assessments and restoration guidance.',
    avatar: null,
    linkedIn: null,
    twitter: null,
  },
]

// Calculate dates (spread over recent months, most recent = today)
const today = new Date()
const daysAgo = (days: number) => {
  const date = new Date(today)
  date.setDate(date.getDate() - days)
  return date
}

const blogPosts = [
  {
    slug: 'first-time-auction-bidding-guide',
    category: 'auction-tips',
    tags: ['beginner', 'bidding', 'auctions', 'classic cars'],
    readingTime: 7,
    publishedAt: daysAgo(0), // Today
    titleEn: 'Your First Classic Car Auction: A Complete Guide for New Bidders',
    titleRo: 'Prima Ta Licitație de Mașini Clasice: Ghid Complet pentru Începători',
    excerptEn: 'Everything you need to know before placing your first bid at a classic car auction, from research and budgeting to bidding strategies that work.',
    excerptRo: 'Tot ce trebuie să știi înainte de a plasa prima ta licitație la o licitație de mașini clasice, de la cercetare și bugetare la strategii de licitare care funcționează.',
    metaTitleEn: 'First-Time Classic Car Auction Guide | Bidding Tips for Beginners',
    metaTitleRo: 'Ghid pentru Prima Licitație de Mașini Clasice | Sfaturi pentru Începători',
    metaDescriptionEn: 'Learn how to bid confidently at classic car auctions. Our comprehensive guide covers research, budgeting, inspection, and bidding strategies for first-time buyers.',
    metaDescriptionRo: 'Învață cum să licitezi cu încredere la licitațiile de mașini clasice. Ghidul nostru acoperă cercetarea, bugetarea, inspecția și strategiile de licitare pentru cumpărătorii începători.',
    contentEn: `
<p>Walking into a classic car auction for the first time can be overwhelming. The rapid-fire bidding, the specialized terminology, and the high stakes all combine to create an environment that can intimidate even confident buyers. But with the right preparation, bidding on classic cars can be both rewarding and manageable.</p>

<h2>Before the Auction: Research is Everything</h2>

<p>The most successful auction buyers do their homework long before the gavel falls. Start by researching the specific make and model you're interested in. Understand the production numbers, common issues, and what separates a good example from a great one.</p>

<p>Check recent auction results for comparable vehicles. Platforms like Finds show recent sales data from across Europe, giving you a realistic picture of current market values. A 1972 Alfa Romeo GTV that sold for €35,000 six months ago is a better price indicator than a magazine valuation guide.</p>

<h3>Key Research Steps:</h3>
<ul>
<li>Study 6-12 months of comparable sales data</li>
<li>Join marque-specific forums and clubs</li>
<li>Understand the difference between "matching numbers" and "correct specification"</li>
<li>Research the specific auction house's buyer fees and terms</li>
</ul>

<h2>Setting Your Budget (The Real Number)</h2>

<p>The hammer price is just the beginning. You need to account for:</p>

<ul>
<li><strong>Buyer's premium:</strong> Typically 5-15% of the hammer price. At Finds, we charge a transparent 5% buyer fee with no hidden costs.</li>
<li><strong>Transport:</strong> Budget €500-2,000 for enclosed transport within Europe, depending on distance.</li>
<li><strong>Registration and taxes:</strong> Import duties if applicable, registration fees, and first-time registration taxes vary by country.</li>
<li><strong>Immediate repairs:</strong> Even well-described cars often need work. Budget 10-15% for unexpected items.</li>
</ul>

<p>Your maximum bid should be calculated backwards from your total available budget, not forward from the estimate.</p>

<h2>Inspecting the Vehicle</h2>

<p>Never bid on a car you haven't personally inspected or had inspected by a trusted expert. Photos hide sins. Walk-around videos are better, but nothing replaces being there.</p>

<p>Attend the preview day. Bring a flashlight, a small mirror on a stick for checking underbody areas, and a notepad. Check:</p>

<ul>
<li>Panel gaps and alignment (indicates previous accident work)</li>
<li>Consistent paint finish under different lighting</li>
<li>Evidence of rust in typical problem areas</li>
<li>Matching numbers on major components</li>
<li>Documentation and service history</li>
</ul>

<h2>Bidding Strategy: Stay Calm, Stay Disciplined</h2>

<p>Auction fever is real. The competitive atmosphere, the fast pace, and the fear of missing out can push you well past your budget. Combat this with a simple rule: <strong>set your maximum bid before the auction starts, and do not exceed it.</strong></p>

<p>Start conservatively. Let others establish the opening pace. Pay attention to who else is bidding — dealers often drop out earlier as they need to maintain margin, while private collectors may bid emotionally.</p>

<p>If bidding slows, a confident jump bid can sometimes close out competition. But don't use this tactic near your maximum — you might just encourage a bidding war you can't afford to win.</p>

<h2>What Happens If You Win</h2>

<p>Congratulations! But the work isn't over. You'll typically need to:</p>

<ol>
<li>Complete payment within the specified timeframe (usually 24-72 hours for deposits, 7-14 days for full payment)</li>
<li>Arrange transport and insurance</li>
<li>Complete registration paperwork in your home country</li>
<li>Consider a more thorough inspection now that the car is yours</li>
</ol>

<p>At Finds, we facilitate communication between buyer and seller after payment is complete, making the handover process straightforward.</p>

<h2>Final Thoughts</h2>

<p>Your first auction purchase is a learning experience. Even if you don't win, attending auctions builds knowledge and confidence. Watch how experienced bidders operate. Note which cars sell above or below estimate. This intelligence pays dividends when your perfect car finally comes up for sale.</p>

<p>The classic car market in 2025 continues to evolve, with online bidding making participation easier than ever. Whether you're in Bucharest or Barcelona, you can now bid on vehicles across Europe from your living room — though we still recommend seeing the car in person whenever possible.</p>

<p>Ready to start? <a href="/auctions">Browse current auctions on Finds</a> and see what catches your eye.</p>
`,
    contentRo: `
<p>Participarea la prima licitație de mașini clasice poate fi copleșitoare. Ritmul rapid al licitațiilor, terminologia specializată și mizele mari se combină pentru a crea un mediu care poate intimida chiar și cumpărătorii încrezători. Dar cu pregătirea potrivită, licitarea pentru mașini clasice poate fi atât recompensatoare, cât și gestionabilă.</p>

<h2>Înainte de Licitație: Cercetarea Este Totul</h2>

<p>Cei mai de succes cumpărători de la licitații își fac temele cu mult înainte de căderea ciocanului. Începe prin a cerceta marca și modelul specific care te interesează. Înțelege numerele de producție, problemele comune și ce separă un exemplar bun de unul excelent.</p>

<p>Verifică rezultatele recente ale licitațiilor pentru vehicule comparabile. Platforme precum Finds arată date de vânzări recente din toată Europa, oferindu-ți o imagine realistă a valorilor actuale de piață. Un Alfa Romeo GTV din 1972 care s-a vândut cu 35.000 € acum șase luni este un indicator de preț mai bun decât un ghid de evaluare dintr-o revistă.</p>

<h3>Pași Cheie de Cercetare:</h3>
<ul>
<li>Studiază 6-12 luni de date de vânzări comparabile</li>
<li>Alătură-te forumurilor și cluburilor specifice mărcii</li>
<li>Înțelege diferența dintre "numere originale" și "specificație corectă"</li>
<li>Cercetează taxele și termenii specifici casei de licitații</li>
</ul>

<h2>Stabilirea Bugetului (Numărul Real)</h2>

<p>Prețul de adjudecare este doar începutul. Trebuie să iei în calcul:</p>

<ul>
<li><strong>Comisionul cumpărătorului:</strong> De obicei 5-15% din prețul de adjudecare. La Finds, percepem un comision transparent de 5% fără costuri ascunse.</li>
<li><strong>Transport:</strong> Bugetează 500-2.000 € pentru transport închis în Europa, în funcție de distanță.</li>
<li><strong>Înmatriculare și taxe:</strong> Taxe de import dacă este cazul, taxe de înmatriculare și taxe de primă înmatriculare variază în funcție de țară.</li>
<li><strong>Reparații imediate:</strong> Chiar și mașinile bine descrise au nevoie adesea de lucru. Bugetează 10-15% pentru elemente neașteptate.</li>
</ul>

<p>Licitația ta maximă ar trebui calculată înapoi de la bugetul total disponibil, nu înainte de la estimare.</p>

<h2>Inspectarea Vehiculului</h2>

<p>Nu licita niciodată pentru o mașină pe care nu ai inspectat-o personal sau nu ai făcut-o inspectată de un expert de încredere. Fotografiile ascund defecte. Videoclipurile de prezentare sunt mai bune, dar nimic nu înlocuiește prezența fizică.</p>

<p>Participă la ziua de previzualizare. Adu o lanternă, o oglindă mică pe un băț pentru verificarea zonelor de sub caroserie și un carnet. Verifică:</p>

<ul>
<li>Spațiile dintre panouri și alinierea (indică lucrări anterioare de accident)</li>
<li>Finisajul consistent al vopselei sub diferite lumini</li>
<li>Dovezi de rugină în zonele tipice cu probleme</li>
<li>Numere originale pe componentele principale</li>
<li>Documentație și istoric de service</li>
</ul>

<h2>Strategia de Licitare: Rămâi Calm, Rămâi Disciplinat</h2>

<p>Febra licitației este reală. Atmosfera competitivă, ritmul rapid și frica de a pierde ocazia te pot împinge mult peste buget. Combate acest lucru cu o regulă simplă: <strong>stabilește-ți licitația maximă înainte de începerea licitației și nu o depăși.</strong></p>

<p>Începe conservator. Lasă pe alții să stabilească ritmul de deschidere. Fii atent la cine altcineva licitează — dealerii renunță adesea mai devreme deoarece trebuie să-și mențină marja, în timp ce colecționarii privați pot licita emoțional.</p>

<p>Dacă licitarea încetinește, o licitație de salt încrezătoare poate închide uneori competiția. Dar nu folosi această tactică aproape de maximul tău — s-ar putea să încurajezi un război de licitații pe care nu ți-l permiți să-l câștigi.</p>

<h2>Ce Se Întâmplă Dacă Câștigi</h2>

<p>Felicitări! Dar munca nu s-a terminat. De obicei va trebui să:</p>

<ol>
<li>Finalizezi plata în intervalul de timp specificat (de obicei 24-72 ore pentru depozite, 7-14 zile pentru plata integrală)</li>
<li>Aranjezi transportul și asigurarea</li>
<li>Completezi documentele de înmatriculare în țara ta</li>
<li>Ia în considerare o inspecție mai amănunțită acum că mașina este a ta</li>
</ol>

<p>La Finds, facilităm comunicarea între cumpărător și vânzător după finalizarea plății, făcând procesul de predare simplu.</p>

<h2>Gânduri Finale</h2>

<p>Prima ta achiziție de la licitație este o experiență de învățare. Chiar dacă nu câștigi, participarea la licitații construiește cunoștințe și încredere. Urmărește cum operează licitatorii experimentați. Notează ce mașini se vând peste sau sub estimare. Această inteligență aduce dividende când mașina ta perfectă apare în cele din urmă la vânzare.</p>

<p>Piața mașinilor clasice în 2025 continuă să evolueze, iar licitarea online face participarea mai ușoară ca niciodată. Fie că ești în București sau Barcelona, poți acum să licitezi pentru vehicule din toată Europa din sufrageria ta — deși recomandăm în continuare să vezi mașina personal ori de câte ori este posibil.</p>

<p>Gata să începi? <a href="/auctions">Răsfoiește licitațiile curente pe Finds</a> și vezi ce îți atrage atenția.</p>
`,
  },
  {
    slug: 'barn-find-evaluation-guide',
    category: 'buying-guide',
    tags: ['barn find', 'evaluation', 'hidden costs', 'restoration'],
    readingTime: 8,
    publishedAt: daysAgo(12), // 12 days ago
    titleEn: 'Barn Finds: How to Evaluate Condition and Calculate True Costs',
    titleRo: 'Mașini Descoperite în Hambare: Cum să Evaluezi Starea și să Calculezi Costurile Reale',
    excerptEn: 'That dusty barn find might look like a bargain, but restoration costs can quickly exceed the finished value. Learn how to assess condition and avoid costly mistakes.',
    excerptRo: 'Acea mașină prăfuită descoperită în hambar ar putea părea o afacere bună, dar costurile de restaurare pot depăși rapid valoarea finală. Învață cum să evaluezi starea și să eviți greșelile costisitoare.',
    metaTitleEn: 'Barn Find Evaluation Guide | Hidden Costs & Condition Assessment',
    metaTitleRo: 'Ghid de Evaluare pentru Mașini din Hambare | Costuri Ascunse și Evaluarea Stării',
    metaDescriptionEn: 'Learn to evaluate barn find cars properly. Understand hidden costs, assess structural condition, and calculate realistic restoration budgets before you buy.',
    metaDescriptionRo: 'Învață să evaluezi corect mașinile descoperite în hambare. Înțelege costurile ascunse, evaluează starea structurală și calculează bugete realiste de restaurare înainte de a cumpăra.',
    contentEn: `
<p>There's something magical about barn finds. A classic car, hidden away for decades, waiting to be rediscovered and brought back to life. The romance is real — but so are the financial risks. Too many enthusiasts have learned the hard way that a €5,000 barn find can easily become a €50,000 project that's still not finished.</p>

<h2>The Appeal — And The Reality</h2>

<p>Barn finds attract buyers for obvious reasons: lower entry prices, the thrill of discovery, and the satisfaction of saving a piece of automotive history. But that appeal can cloud financial judgment. The rule is simple: <strong>restoration almost always costs more than buying a finished example.</strong></p>

<p>There are exceptions. Rare, high-value cars where the completed value justifies extensive restoration. Cases where you have the skills to do significant work yourself. Projects where you're in it for the journey, not the financial outcome. But if you're expecting a profitable flip or a cheap way into classic car ownership, adjust your expectations now.</p>

<h2>Evaluating Structural Condition</h2>

<p>The frame and underbody tell the real story. Everything else can be restored, but serious structural rust means either expensive metalwork or walking away.</p>

<h3>Critical Inspection Points:</h3>
<ul>
<li><strong>Frame rails:</strong> Push an awl or screwdriver into suspected rust areas. Solid metal should resist; rust will crumble.</li>
<li><strong>Floor pans:</strong> Check from above and below. Surface rust is manageable; holes mean replacement panels.</li>
<li><strong>Rocker panels and sills:</strong> These structural elements often hide serious rot behind surface presentation.</li>
<li><strong>Suspension mounting points:</strong> Front strut towers and rear spring hangers carry tremendous stress. Rust here is expensive.</li>
<li><strong>Trunk floor and battery tray:</strong> Acid damage and water accumulation make these common problem areas.</li>
</ul>

<h2>Storage Conditions Matter</h2>

<p>A car stored in a dry barn in southern Spain presents very differently from one in a damp shed in northern Germany. Ask about:</p>

<ul>
<li>Was it driven into storage, or towed?</li>
<li>Were fluids drained or preserved?</li>
<li>Was the fuel tank left full or empty? (Both cause problems)</li>
<li>Concrete floor or dirt? (Moisture wicks up through dirt)</li>
<li>Any vermin damage? (Mice love wiring harnesses)</li>
</ul>

<h2>Calculating True Restoration Costs</h2>

<p>Here's a realistic breakdown for a typical European classic restoration:</p>

<h3>Body and Paint</h3>
<ul>
<li>Full strip and repaint: €8,000 - €20,000+</li>
<li>Significant rust repair: €3,000 - €15,000</li>
<li>Panel replacement: €500 - €3,000 per panel</li>
<li>Chrome replating: €2,000 - €5,000 for complete trim</li>
</ul>

<h3>Mechanical</h3>
<ul>
<li>Engine rebuild: €3,000 - €10,000</li>
<li>Transmission rebuild: €1,500 - €4,000</li>
<li>Brake system: €800 - €2,500</li>
<li>Suspension refresh: €1,500 - €4,000</li>
<li>Cooling system: €500 - €1,500</li>
</ul>

<h3>Interior</h3>
<ul>
<li>Full upholstery: €3,000 - €8,000</li>
<li>Dashboard restoration: €1,000 - €3,000</li>
<li>Carpet set: €400 - €1,200</li>
<li>Headliner: €400 - €1,000</li>
</ul>

<h3>Electrical</h3>
<ul>
<li>Complete rewire: €1,500 - €4,000</li>
<li>Instrument restoration: €800 - €2,000</li>
</ul>

<p>For a typical barn find requiring comprehensive restoration, budget €25,000 - €60,000 in restoration costs alone, plus the purchase price. Then compare this total to prices for already-restored examples of the same car.</p>

<h2>Hidden Costs Most Buyers Miss</h2>

<ul>
<li><strong>Transport to workshop:</strong> Barn finds rarely drive. Flatbed costs add up.</li>
<li><strong>Storage during restoration:</strong> Multi-year projects need space.</li>
<li><strong>Parts sourcing time:</strong> Your labor or a specialist's. Either costs money.</li>
<li><strong>Unexpected discoveries:</strong> Budget 30% contingency for problems you'll only find once work begins.</li>
<li><strong>Outstanding liens:</strong> Always verify clear title. Cars used as collateral can carry debts.</li>
</ul>

<h2>When Barn Finds Make Sense</h2>

<p>Despite the warnings, barn finds can be worthwhile:</p>

<ul>
<li>When the purchase price is proportionally low enough to offset restoration costs</li>
<li>For rare cars where restored examples simply don't come to market</li>
<li>When you can do significant work yourself and value the process</li>
<li>When matching numbers or originality commands significant premiums that outweigh restoration costs</li>
</ul>

<h2>Before You Buy</h2>

<p>Get a professional pre-purchase inspection. Yes, even for barn finds. Especially for barn finds. A €300 inspection that identifies €15,000 in hidden rust damage is money well spent.</p>

<p>At Finds, our barn find and project car listings include detailed condition assessments and photo documentation. We require sellers to disclose known issues, helping you make informed decisions before bidding.</p>

<p>The right barn find can be the beginning of an incredible journey. Just make sure you're walking into it with open eyes and a realistic budget.</p>
`,
    contentRo: `
<p>Este ceva magic în privința mașinilor descoperite în hambare. O mașină clasică, ascunsă timp de decenii, așteptând să fie redescoperită și readusă la viață. Romantismul este real — dar la fel sunt și riscurile financiare. Prea mulți entuziaști au învățat pe pielea lor că o descoperire de 5.000 € într-un hambar poate deveni ușor un proiect de 50.000 € care încă nu este terminat.</p>

<h2>Atractivitatea — Și Realitatea</h2>

<p>Mașinile din hambare atrag cumpărătorii din motive evidente: prețuri de intrare mai mici, emoția descoperirii și satisfacția de a salva o piesă din istoria automobilelor. Dar acea atractivitate poate întuneca judecata financiară. Regula este simplă: <strong>restaurarea costă aproape întotdeauna mai mult decât cumpărarea unui exemplar finalizat.</strong></p>

<p>Există excepții. Mașini rare, de mare valoare, unde valoarea completată justifică restaurarea extinsă. Cazuri în care ai abilitățile de a face singur lucrări semnificative. Proiecte în care ești în ele pentru călătorie, nu pentru rezultatul financiar. Dar dacă te aștepți la un profit din revânzare sau la o modalitate ieftină de a intra în proprietatea de mașini clasice, ajustează-ți așteptările acum.</p>

<h2>Evaluarea Stării Structurale</h2>

<p>Cadrul și partea de jos spun povestea reală. Orice altceva poate fi restaurat, dar rugina structurală serioasă înseamnă fie lucrări de metal costisitoare, fie plecarea.</p>

<h3>Puncte Critice de Inspecție:</h3>
<ul>
<li><strong>Lonjeroane:</strong> Împinge o sulă sau o șurubelniță în zonele suspectate de rugină. Metalul solid ar trebui să reziste; rugina se va prăbuși.</li>
<li><strong>Podea:</strong> Verifică de sus și de jos. Rugina de suprafață este gestionabilă; găurile înseamnă panouri de înlocuire.</li>
<li><strong>Praguri și lonjeroane laterale:</strong> Aceste elemente structurale ascund adesea putrezire serioasă în spatele prezentării de suprafață.</li>
<li><strong>Puncte de montare suspensie:</strong> Turnurile de amortizoare din față și suporturile de arcuri din spate suportă un stres tremend. Rugina aici este scumpă.</li>
<li><strong>Podeaua portbagajului și tava bateriei:</strong> Daunele de acid și acumularea de apă fac acestea zone comune de probleme.</li>
</ul>

<h2>Condițiile de Depozitare Contează</h2>

<p>O mașină depozitată într-un hambar uscat în sudul Spaniei se prezintă foarte diferit de una dintr-un șopron umed în nordul Germaniei. Întreabă despre:</p>

<ul>
<li>A fost condusă în depozit sau remorcată?</li>
<li>Au fost lichidele golite sau conservate?</li>
<li>Rezervorul de combustibil a fost lăsat plin sau gol? (Ambele cauzează probleme)</li>
<li>Podea de beton sau pământ? (Umiditatea urcă prin pământ)</li>
<li>Daune de la rozătoare? (Șoarecii adoră instalațiile electrice)</li>
</ul>

<h2>Calcularea Costurilor Reale de Restaurare</h2>

<p>Iată o defalcare realistă pentru o restaurare tipică de mașină clasică europeană:</p>

<h3>Caroserie și Vopsea</h3>
<ul>
<li>Dezbrăcare completă și revopsire: 8.000 - 20.000+ €</li>
<li>Reparații semnificative de rugină: 3.000 - 15.000 €</li>
<li>Înlocuire panouri: 500 - 3.000 € per panou</li>
<li>Recromare: 2.000 - 5.000 € pentru toate ornamentele</li>
</ul>

<h3>Mecanic</h3>
<ul>
<li>Reconstrucție motor: 3.000 - 10.000 €</li>
<li>Reconstrucție transmisie: 1.500 - 4.000 €</li>
<li>Sistem de frânare: 800 - 2.500 €</li>
<li>Reîmprospătare suspensie: 1.500 - 4.000 €</li>
<li>Sistem de răcire: 500 - 1.500 €</li>
</ul>

<h3>Interior</h3>
<ul>
<li>Tapițerie completă: 3.000 - 8.000 €</li>
<li>Restaurare bord: 1.000 - 3.000 €</li>
<li>Set covoare: 400 - 1.200 €</li>
<li>Plafoniera: 400 - 1.000 €</li>
</ul>

<h3>Electric</h3>
<ul>
<li>Recablare completă: 1.500 - 4.000 €</li>
<li>Restaurare instrumente: 800 - 2.000 €</li>
</ul>

<p>Pentru o mașină tipică din hambar care necesită restaurare cuprinzătoare, bugetează 25.000 - 60.000 € doar în costuri de restaurare, plus prețul de achiziție. Apoi compară acest total cu prețurile pentru exemplare deja restaurate ale aceleiași mașini.</p>

<h2>Costuri Ascunse Pe Care Majoritatea Cumpărătorilor Le Ratează</h2>

<ul>
<li><strong>Transport la atelier:</strong> Mașinile din hambare rareori merg. Costurile de platformă se adună.</li>
<li><strong>Depozitare în timpul restaurării:</strong> Proiectele de mai mulți ani au nevoie de spațiu.</li>
<li><strong>Timp pentru aprovizionarea cu piese:</strong> Munca ta sau a unui specialist. Oricare costă bani.</li>
<li><strong>Descoperiri neașteptate:</strong> Bugetează 30% contingență pentru probleme pe care le vei găsi doar odată ce munca începe.</li>
<li><strong>Garanții restante:</strong> Verifică întotdeauna titlul clar. Mașinile folosite ca garanție pot purta datorii.</li>
</ul>

<h2>Când Au Sens Mașinile din Hambare</h2>

<p>În ciuda avertismentelor, mașinile din hambare pot merita:</p>

<ul>
<li>Când prețul de achiziție este proporțional suficient de mic pentru a compensa costurile de restaurare</li>
<li>Pentru mașini rare unde exemplarele restaurate pur și simplu nu ajung pe piață</li>
<li>Când poți face singur lucrări semnificative și apreciezi procesul</li>
<li>Când numerele originale sau originalitatea comandă prime semnificative care depășesc costurile de restaurare</li>
</ul>

<h2>Înainte de a Cumpăra</h2>

<p>Obține o inspecție profesională înainte de cumpărare. Da, chiar și pentru mașinile din hambare. Mai ales pentru mașinile din hambare. O inspecție de 300 € care identifică 15.000 € în daune ascunse de rugină este bani bine cheltuiți.</p>

<p>La Finds, listările noastre de mașini din hambare și proiecte includ evaluări detaliate ale stării și documentație foto. Cerem vânzătorilor să dezvăluie problemele cunoscute, ajutându-te să iei decizii informate înainte de a licita.</p>

<p>Mașina potrivită din hambar poate fi începutul unei călătorii incredibile. Doar asigură-te că intri în ea cu ochii deschiși și un buget realist.</p>
`,
  },
  {
    slug: 'avoid-classic-car-scams',
    category: 'fraud-prevention',
    tags: ['scams', 'fraud', 'verification', 'safety'],
    readingTime: 6,
    publishedAt: daysAgo(25), // 25 days ago
    titleEn: 'How to Avoid Scams When Buying Classic Cars Online',
    titleRo: 'Cum să Eviți Înșelătoriile la Cumpărarea de Mașini Clasice Online',
    excerptEn: 'Fraudsters target classic car buyers with sophisticated scams. Learn the warning signs and verification steps that protect your money.',
    excerptRo: 'Escrocii țintesc cumpărătorii de mașini clasice cu înșelătorii sofisticate. Învață semnele de avertizare și pașii de verificare care îți protejează banii.',
    metaTitleEn: 'Avoid Classic Car Scams Online | Fraud Prevention Guide',
    metaTitleRo: 'Evită Înșelătoriile cu Mașini Clasice Online | Ghid de Prevenire a Fraudei',
    metaDescriptionEn: 'Protect yourself from classic car scams with our fraud prevention guide. Learn to verify sellers, spot fake listings, and use secure payment methods.',
    metaDescriptionRo: 'Protejează-te de înșelătoriile cu mașini clasice cu ghidul nostru de prevenire a fraudei. Învață să verifici vânzătorii, să depistezi anunțurile false și să folosești metode de plată sigure.',
    contentEn: `
<p>The classic car market attracts passionate collectors — and unfortunately, also attracts criminals who exploit that passion. Online scams targeting classic car buyers have grown more sophisticated, with fraudsters creating elaborate fake dealerships, stealing legitimate listings, and running payment schemes that leave buyers with nothing.</p>

<p>The average loss in vehicle purchase scams exceeds €12,000. Many victims are experienced buyers who simply didn't catch the warning signs. Here's how to protect yourself.</p>

<h2>Red Flags That Signal Fraud</h2>

<h3>Pricing Too Good to Be True</h3>
<p>A 1967 Porsche 911 for €30,000 when the market says €80,000? That's not a bargain — it's bait. Scammers use unrealistic prices to attract victims quickly before due diligence can occur.</p>

<h3>Pressure to Act Fast</h3>
<p>"Another buyer is very interested" or "The price goes up tomorrow" are manipulation tactics. Legitimate sellers understand that significant purchases require consideration time.</p>

<h3>Reluctance to Meet or Communicate by Phone</h3>
<p>Fraudsters prefer text and email where they can carefully craft responses and avoid revealing inconsistencies. If a seller won't take a phone call or video chat, ask yourself why.</p>

<h3>Unusual Payment Requests</h3>
<p>Wire transfers, cryptocurrency, gift cards, or payments to escrow services you've never heard of are classic scam mechanisms. Once sent, these payments cannot be recovered.</p>

<h2>Verification Steps That Work</h2>

<h3>Verify the Seller's Identity</h3>
<ul>
<li>Search their phone number, email, and address online</li>
<li>For dealers, verify business registration and premises via Google Street View</li>
<li>Check for reviews across multiple platforms</li>
<li>Ask for ID verification — legitimate sellers understand why</li>
</ul>

<h3>Verify the Vehicle Exists</h3>
<ul>
<li>Request a current photo with today's newspaper or a handwritten note with date and your name</li>
<li>Reverse image search listing photos to check if they're stolen from other ads</li>
<li>Cross-reference the VIN with official databases</li>
<li>Ask for a video call walk-around of the vehicle</li>
</ul>

<h3>Verify Documentation</h3>
<ul>
<li>Request registration documents and compare VINs</li>
<li>Check service history documentation</li>
<li>For import vehicles, verify customs clearance paperwork</li>
<li>Consider a professional history check service</li>
</ul>

<h2>Safe Payment Practices</h2>

<ul>
<li><strong>Never pay the full amount before seeing the car</strong> — or having it inspected by a trusted party</li>
<li><strong>Use traceable payment methods</strong> — credit cards offer fraud protection that wire transfers don't</li>
<li><strong>Be wary of escrow services</strong> — scammers create fake escrow websites that look legitimate</li>
<li><strong>For cash transactions, meet at a bank</strong> — where notes can be verified</li>
<li><strong>Document everything</strong> — keep records of all communication and payments</li>
</ul>

<h2>How Finds Protects Buyers</h2>

<p>At Finds, buyer protection is built into the platform:</p>

<ul>
<li><strong>Seller verification:</strong> All sellers complete identity verification before listing</li>
<li><strong>Payment security:</strong> Funds are held securely until transaction completion</li>
<li><strong>Listing review:</strong> Our team reviews listings for accuracy and red flags</li>
<li><strong>Transparent fees:</strong> A clear 5% buyer premium with no hidden charges</li>
<li><strong>Dispute resolution:</strong> Support for buyers if issues arise</li>
</ul>

<h2>What To Do If You've Been Scammed</h2>

<p>Act immediately:</p>

<ol>
<li>Contact your bank or payment provider to attempt reversal</li>
<li>Report to local police with all documentation</li>
<li>File a report with consumer protection agencies</li>
<li>Report the listing to the platform where you found it</li>
<li>Document everything for potential legal action</li>
</ol>

<p>Recovery is difficult but not always impossible, especially if you act quickly and the payment method offers protection.</p>

<h2>Trust Your Instincts</h2>

<p>If something feels wrong, it probably is. Professional sellers welcome verification because it builds trust. Anyone who discourages due diligence is telling you something important about their intentions.</p>

<p>The classic car market offers wonderful opportunities — but only for those who approach it with appropriate caution. Take your time, verify everything, and when in doubt, walk away.</p>
`,
    contentRo: `
<p>Piața mașinilor clasice atrage colecționari pasionați — și, din păcate, atrage și criminali care exploatează acea pasiune. Înșelătoriile online care țintesc cumpărătorii de mașini clasice au devenit mai sofisticate, cu escroci care creează dealership-uri false elaborate, fură anunțuri legitime și derulează scheme de plată care lasă cumpărătorii fără nimic.</p>

<p>Pierderea medie în înșelătoriile de achiziție de vehicule depășește 12.000 €. Multe victime sunt cumpărători experimentați care pur și simplu nu au prins semnele de avertizare. Iată cum să te protejezi.</p>

<h2>Semnale de Alarmă Care Indică Fraudă</h2>

<h3>Prețuri Prea Bune Pentru a Fi Adevărate</h3>
<p>Un Porsche 911 din 1967 pentru 30.000 € când piața spune 80.000 €? Aceasta nu este o afacere — este o momeală. Escrocii folosesc prețuri nerealiste pentru a atrage victimele rapid înainte ca verificarea să poată avea loc.</p>

<h3>Presiune să Acționezi Rapid</h3>
<p>"Un alt cumpărător este foarte interesat" sau "Prețul crește mâine" sunt tactici de manipulare. Vânzătorii legitimi înțeleg că achizițiile semnificative necesită timp de considerare.</p>

<h3>Reticență în a te Întâlni sau a Comunica Telefonic</h3>
<p>Escrocii preferă textul și emailul unde pot crea cu atenție răspunsuri și pot evita dezvăluirea inconsistențelor. Dacă un vânzător nu acceptă un apel telefonic sau video, întreabă-te de ce.</p>

<h3>Cereri de Plată Neobișnuite</h3>
<p>Transferuri bancare, criptomonede, carduri cadou sau plăți către servicii de escrow de care nu ai auzit niciodată sunt mecanisme clasice de înșelătorie. Odată trimise, aceste plăți nu pot fi recuperate.</p>

<h2>Pași de Verificare Care Funcționează</h2>

<h3>Verifică Identitatea Vânzătorului</h3>
<ul>
<li>Caută numărul lor de telefon, emailul și adresa online</li>
<li>Pentru dealeri, verifică înregistrarea afacerii și sediul via Google Street View</li>
<li>Verifică recenziile pe mai multe platforme</li>
<li>Cere verificarea identității — vânzătorii legitimi înțeleg de ce</li>
</ul>

<h3>Verifică că Vehiculul Există</h3>
<ul>
<li>Cere o fotografie actuală cu ziarul de azi sau o notă scrisă de mână cu data și numele tău</li>
<li>Caută invers imaginile anunțului pentru a verifica dacă sunt furate din alte reclame</li>
<li>Verifică încrucișat VIN-ul cu bazele de date oficiale</li>
<li>Cere o prezentare video a vehiculului</li>
</ul>

<h3>Verifică Documentația</h3>
<ul>
<li>Cere documente de înmatriculare și compară VIN-urile</li>
<li>Verifică documentația istoricului de service</li>
<li>Pentru vehicule de import, verifică documentele de vămuire</li>
<li>Ia în considerare un serviciu profesional de verificare a istoricului</li>
</ul>

<h2>Practici de Plată Sigure</h2>

<ul>
<li><strong>Nu plăti niciodată suma integrală înainte de a vedea mașina</strong> — sau de a o face inspectată de o parte de încredere</li>
<li><strong>Folosește metode de plată trasabile</strong> — cardurile de credit oferă protecție împotriva fraudei pe care transferurile bancare nu o oferă</li>
<li><strong>Fii atent la serviciile de escrow</strong> — escrocii creează site-uri false de escrow care arată legitim</li>
<li><strong>Pentru tranzacții cu numerar, întâlnește-te la bancă</strong> — unde bancnotele pot fi verificate</li>
<li><strong>Documentează totul</strong> — păstrează înregistrări ale tuturor comunicărilor și plăților</li>
</ul>

<h2>Cum Protejează Finds Cumpărătorii</h2>

<p>La Finds, protecția cumpărătorului este integrată în platformă:</p>

<ul>
<li><strong>Verificarea vânzătorilor:</strong> Toți vânzătorii completează verificarea identității înainte de listare</li>
<li><strong>Securitatea plăților:</strong> Fondurile sunt păstrate în siguranță până la finalizarea tranzacției</li>
<li><strong>Revizuirea anunțurilor:</strong> Echipa noastră revizuiește anunțurile pentru acuratețe și semnale de alarmă</li>
<li><strong>Taxe transparente:</strong> O primă clară de 5% pentru cumpărător fără taxe ascunse</li>
<li><strong>Rezolvarea disputelor:</strong> Suport pentru cumpărători dacă apar probleme</li>
</ul>

<h2>Ce Să Faci Dacă Ai Fost Înșelat</h2>

<p>Acționează imediat:</p>

<ol>
<li>Contactează banca sau furnizorul de plăți pentru a încerca reversarea</li>
<li>Raportează la poliția locală cu toată documentația</li>
<li>Depune un raport la agențiile de protecție a consumatorilor</li>
<li>Raportează anunțul la platforma unde l-ai găsit</li>
<li>Documentează totul pentru potențiale acțiuni legale</li>
</ol>

<p>Recuperarea este dificilă dar nu întotdeauna imposibilă, mai ales dacă acționezi rapid și metoda de plată oferă protecție.</p>

<h2>Ai Încredere în Instinctele Tale</h2>

<p>Dacă ceva pare greșit, probabil că este. Vânzătorii profesioniști întâmpină verificarea pentru că construiește încredere. Oricine descurajează verificarea îți spune ceva important despre intențiile lor.</p>

<p>Piața mașinilor clasice oferă oportunități minunate — dar doar pentru cei care o abordează cu prudență adecvată. Ia-ți timpul, verifică totul și, când ai îndoieli, pleacă.</p>
`,
  },
  {
    slug: 'auction-vs-private-sale-sellers-guide',
    category: 'selling-guide',
    tags: ['selling', 'auction', 'private sale', 'valuation'],
    readingTime: 6,
    publishedAt: daysAgo(38), // 38 days ago
    titleEn: 'Selling Your Classic Car: Auction vs Private Sale',
    titleRo: 'Vânzarea Mașinii Tale Clasice: Licitație vs Vânzare Privată',
    excerptEn: 'Both auction and private sale have their place. We break down the pros, cons, and which approach suits different types of vehicles and sellers.',
    excerptRo: 'Atât licitația cât și vânzarea privată își au locul lor. Analizăm avantajele, dezavantajele și care abordare se potrivește diferitelor tipuri de vehicule și vânzători.',
    metaTitleEn: 'Sell Classic Car: Auction vs Private Sale Guide | Which Is Better?',
    metaTitleRo: 'Vinde Mașină Clasică: Ghid Licitație vs Vânzare Privată',
    metaDescriptionEn: 'Should you auction your classic car or sell privately? Compare fees, timeframes, and results to choose the best approach for your vehicle.',
    metaDescriptionRo: 'Ar trebui să licitezi mașina ta clasică sau să o vinzi privat? Compară taxele, intervalele de timp și rezultatele pentru a alege cea mai bună abordare pentru vehiculul tău.',
    contentEn: `
<p>You've decided to sell your classic car. Now comes the strategic question: auction or private sale? Each approach has distinct advantages, and the right choice depends on your vehicle, your timeline, and your tolerance for the selling process.</p>

<h2>The Case for Auctions</h2>

<h3>Speed and Certainty</h3>
<p>Auctions produce results within a defined timeframe. A typical online auction runs 7-14 days, and at the end, you either have a sale or a clear signal about market interest. Compare this to private sales that can drag on for months.</p>

<h3>Market-Determined Pricing</h3>
<p>If you're unsure about your car's true value, auction bidding reveals what buyers will actually pay. This removes the guessing game of pricing and the frustration of "lowball" offers that are actually reasonable market bids.</p>

<h3>Access to Qualified Buyers</h3>
<p>Auction platforms pre-qualify bidders with payment verification. You're not dealing with tire-kickers or dreamers — everyone who bids has demonstrated financial readiness to complete the purchase.</p>

<h3>Professional Presentation</h3>
<p>Quality auction platforms handle listing creation, photography guidance, and marketing. For sellers who aren't comfortable writing compelling vehicle descriptions or reaching the right audience, this support is valuable.</p>

<h3>When Auctions Work Best</h3>
<ul>
<li>Desirable, well-documented vehicles that will attract competitive bidding</li>
<li>Sellers who want a defined timeline and minimal ongoing involvement</li>
<li>Vehicles in the €25,000-€250,000 range where auction audiences are strongest</li>
<li>Motivated sellers who are realistic about market values</li>
</ul>

<h2>The Case for Private Sales</h2>

<h3>Maximum Price Control</h3>
<p>You set the price and can reject any offer below your threshold. For patient sellers with highly desirable cars, this can mean capturing full retail value rather than wholesale or auction prices.</p>

<h3>Fee Savings</h3>
<p>Private sales avoid auction commissions. However, factor in the cost of advertising, your time, and potentially longer holding costs. The "savings" aren't always as significant as they first appear.</p>

<h3>Buyer Relationship</h3>
<p>Some sellers prefer knowing who's buying their car. The personal connection and ability to vet the next owner appeals to those emotionally invested in their vehicle's future.</p>

<h3>When Private Sales Work Best</h3>
<ul>
<li>Rare vehicles with small but dedicated buyer pools who monitor specific sources</li>
<li>Cars where you've already identified a likely buyer (through clubs, shows, etc.)</li>
<li>Sellers with time, sales skills, and tolerance for the process</li>
<li>Lower-value vehicles where auction fees would eat significantly into proceeds</li>
</ul>

<h2>Fee Comparison</h2>

<h3>Auction Fees</h3>
<p>Platforms vary significantly:</p>
<ul>
<li><strong>Finds:</strong> No seller commission in our current model. Buyers pay a 5% fee.</li>
<li><strong>Traditional houses:</strong> Often charge both seller (5-15%) and buyer (10-25%) premiums</li>
<li><strong>Online platforms:</strong> Typically 4-8% seller fees or fixed listing charges</li>
</ul>

<h3>Private Sale Costs</h3>
<ul>
<li>Classified listings: €50-500 depending on platform and duration</li>
<li>Photography: €200-500 for professional shots (worth it)</li>
<li>Your time: Responding to enquiries, arranging viewings, negotiating</li>
<li>Holding costs: Insurance, storage, registration while selling</li>
</ul>

<h2>Preparing Your Car for Sale</h2>

<p>Regardless of method, preparation matters:</p>

<ul>
<li><strong>Documentation:</strong> Gather all service records, MOT/ITV history, and ownership paperwork</li>
<li><strong>Presentation:</strong> A professional detail can add more to the sale price than it costs</li>
<li><strong>Repairs:</strong> Fix easy issues. Leave major work for the new owner to price in.</li>
<li><strong>Photography:</strong> Clean environment, good light, comprehensive coverage</li>
<li><strong>Honesty:</strong> Disclose issues upfront. Hidden problems destroy deals and reputations.</li>
</ul>

<h2>The Finds Approach</h2>

<p>We built Finds to combine auction benefits with seller-friendly terms:</p>

<ul>
<li><strong>Zero seller commission</strong> — our revenue comes from buyer fees</li>
<li><strong>Curated listings</strong> — we review submissions to maintain quality standards</li>
<li><strong>Reserve prices</strong> — protect your minimum acceptable price</li>
<li><strong>EU-wide audience</strong> — reach collectors across Europe</li>
<li><strong>Seller support</strong> — guidance on listing creation and pricing strategy</li>
</ul>

<h2>Making the Decision</h2>

<p>Ask yourself:</p>
<ol>
<li>How quickly do I need to sell?</li>
<li>Am I confident about my car's market value?</li>
<li>Do I enjoy the selling process, or would I rather outsource it?</li>
<li>Is my car likely to attract competitive bidding interest?</li>
</ol>

<p>For most sellers of desirable classic cars, auctions offer the best combination of speed, convenience, and fair market pricing. Private sales remain viable for specific situations but require more work and patience.</p>

<p>Ready to explore your options? <a href="/sell">Submit your vehicle to Finds</a> for a no-obligation evaluation.</p>
`,
    contentRo: `
<p>Ai decis să vinzi mașina ta clasică. Acum vine întrebarea strategică: licitație sau vânzare privată? Fiecare abordare are avantaje distincte, iar alegerea corectă depinde de vehiculul tău, de intervalul de timp și de toleranța ta pentru procesul de vânzare.</p>

<h2>Argumentul pentru Licitații</h2>

<h3>Viteză și Certitudine</h3>
<p>Licitațiile produc rezultate într-un interval de timp definit. O licitație online tipică durează 7-14 zile, și la final, fie ai o vânzare, fie un semnal clar despre interesul pieței. Compară aceasta cu vânzările private care pot dura luni de zile.</p>

<h3>Prețuri Determinate de Piață</h3>
<p>Dacă nu ești sigur de valoarea reală a mașinii tale, licitarea dezvăluie ce vor plăti efectiv cumpărătorii. Aceasta elimină jocul de ghicit al stabilirii prețului și frustrarea ofertelor "mici" care sunt de fapt licitatii rezonabile de piață.</p>

<h3>Acces la Cumpărători Calificați</h3>
<p>Platformele de licitații precalifică licitatorii cu verificarea plății. Nu ai de-a face cu curioși sau visători — toți cei care licitează au demonstrat disponibilitate financiară pentru a finaliza achiziția.</p>

<h3>Prezentare Profesională</h3>
<p>Platformele de licitații de calitate gestionează crearea anunțului, îndrumarea pentru fotografii și marketingul. Pentru vânzătorii care nu sunt confortabili să scrie descrieri captivante ale vehiculelor sau să ajungă la audiența potrivită, acest suport este valoros.</p>

<h3>Când Funcționează Cel Mai Bine Licitațiile</h3>
<ul>
<li>Vehicule dezirabile, bine documentate care vor atrage licitare competitivă</li>
<li>Vânzători care doresc un interval de timp definit și implicare minimă continuă</li>
<li>Vehicule în intervalul 25.000-250.000 € unde audiențele de licitație sunt cele mai puternice</li>
<li>Vânzători motivați care sunt realiști în privința valorilor de piață</li>
</ul>

<h2>Argumentul pentru Vânzări Private</h2>

<h3>Control Maxim al Prețului</h3>
<p>Tu stabilești prețul și poți respinge orice ofertă sub pragul tău. Pentru vânzătorii răbdători cu mașini foarte dezirabile, aceasta poate însemna captarea valorii complete de retail în loc de prețuri en-gros sau de licitație.</p>

<h3>Economii de Taxe</h3>
<p>Vânzările private evită comisioanele de licitație. Totuși, ia în calcul costul publicității, timpul tău și potențial costuri de deținere mai lungi. "Economiile" nu sunt întotdeauna atât de semnificative pe cât par inițial.</p>

<h3>Relația cu Cumpărătorul</h3>
<p>Unii vânzători preferă să știe cine cumpără mașina lor. Conexiunea personală și capacitatea de a verifica viitorul proprietar atrage pe cei investiți emoțional în viitorul vehiculului lor.</p>

<h3>Când Funcționează Cel Mai Bine Vânzările Private</h3>
<ul>
<li>Vehicule rare cu grupuri mici dar dedicate de cumpărători care monitorizează surse specifice</li>
<li>Mașini pentru care ai identificat deja un probabil cumpărător (prin cluburi, expoziții, etc.)</li>
<li>Vânzători cu timp, abilități de vânzare și toleranță pentru proces</li>
<li>Vehicule de valoare mai mică unde taxele de licitație ar consuma semnificativ din încasări</li>
</ul>

<h2>Comparația Taxelor</h2>

<h3>Taxe de Licitație</h3>
<p>Platformele variază semnificativ:</p>
<ul>
<li><strong>Finds:</strong> Fără comision pentru vânzător în modelul nostru actual. Cumpărătorii plătesc un comision de 5%.</li>
<li><strong>Case tradiționale:</strong> Adesea percep atât prime pentru vânzător (5-15%) cât și pentru cumpărător (10-25%)</li>
<li><strong>Platforme online:</strong> De obicei taxe de 4-8% pentru vânzător sau taxe fixe de listare</li>
</ul>

<h3>Costuri de Vânzare Privată</h3>
<ul>
<li>Anunțuri clasificate: 50-500 € în funcție de platformă și durată</li>
<li>Fotografii: 200-500 € pentru fotografii profesionale (merită)</li>
<li>Timpul tău: Răspunsul la întrebări, aranjarea vizionărilor, negocierea</li>
<li>Costuri de deținere: Asigurare, depozitare, înmatriculare în timpul vânzării</li>
</ul>

<h2>Pregătirea Mașinii Tale pentru Vânzare</h2>

<p>Indiferent de metodă, pregătirea contează:</p>

<ul>
<li><strong>Documentație:</strong> Adună toate înregistrările de service, istoricul ITP și documentele de proprietate</li>
<li><strong>Prezentare:</strong> Un detailing profesional poate adăuga mai mult la prețul de vânzare decât costă</li>
<li><strong>Reparații:</strong> Repară problemele ușoare. Lasă lucrările majore pentru noul proprietar să le includă în preț.</li>
<li><strong>Fotografii:</strong> Mediu curat, lumină bună, acoperire cuprinzătoare</li>
<li><strong>Onestitate:</strong> Dezvăluie problemele din start. Problemele ascunse distrug tranzacțiile și reputațiile.</li>
</ul>

<h2>Abordarea Finds</h2>

<p>Am construit Finds pentru a combina beneficiile licitației cu termeni prietenoși pentru vânzător:</p>

<ul>
<li><strong>Zero comision pentru vânzător</strong> — veniturile noastre vin din taxele cumpărătorilor</li>
<li><strong>Anunțuri curatate</strong> — revizuim propunerile pentru a menține standarde de calitate</li>
<li><strong>Prețuri de rezervă</strong> — protejează prețul minim acceptabil pentru tine</li>
<li><strong>Audiență la nivel UE</strong> — ajungi la colecționari din toată Europa</li>
<li><strong>Suport pentru vânzător</strong> — îndrumare pentru crearea anunțului și strategia de prețuri</li>
</ul>

<h2>Luarea Deciziei</h2>

<p>Întreabă-te:</p>
<ol>
<li>Cât de repede trebuie să vând?</li>
<li>Sunt încrezător în privința valorii de piață a mașinii mele?</li>
<li>Îmi place procesul de vânzare, sau aș prefera să-l externalizez?</li>
<li>Este probabil ca mașina mea să atragă interes competitiv de licitare?</li>
</ol>

<p>Pentru majoritatea vânzătorilor de mașini clasice dezirabile, licitațiile oferă cea mai bună combinație de viteză, comoditate și prețuri corecte de piață. Vânzările private rămân viabile pentru situații specifice dar necesită mai multă muncă și răbdare.</p>

<p>Gata să explorezi opțiunile tale? <a href="/sell">Trimite vehiculul tău la Finds</a> pentru o evaluare fără obligații.</p>
`,
  },
  {
    slug: 'project-car-restoration-budget-guide',
    category: 'restoration',
    tags: ['restoration', 'budget', 'project car', 'planning'],
    readingTime: 7,
    publishedAt: daysAgo(52), // 52 days ago
    titleEn: 'Planning Your Project Car Restoration: A Realistic Budget Guide',
    titleRo: 'Planificarea Restaurării Mașinii Proiect: Un Ghid Realist de Buget',
    excerptEn: 'Restoration costs spiral out of control when you don\'t plan properly. Here\'s how to create a realistic budget and stick to it.',
    excerptRo: 'Costurile de restaurare scapă de sub control când nu planifici corespunzător. Iată cum să creezi un buget realist și să te ții de el.',
    metaTitleEn: 'Project Car Restoration Budget Guide | Cost Planning Tips',
    metaTitleRo: 'Ghid de Buget pentru Restaurarea Mașinii Proiect | Sfaturi de Planificare',
    metaDescriptionEn: 'Create a realistic restoration budget that accounts for hidden costs. Learn to prioritize spending, source parts economically, and avoid common money traps.',
    metaDescriptionRo: 'Creează un buget de restaurare realist care ține cont de costurile ascunse. Învață să prioritizezi cheltuielile, să procuri piese economic și să eviți capcanele financiare comune.',
    contentEn: `
<p>"I'll just do a light restoration" — famous last words of every project car owner who later discovered their "minor refresh" had consumed years and tens of thousands of euros. Restoration scope creep is real, and the only defense is rigorous planning.</p>

<h2>Understanding True Costs</h2>

<p>The average classic car restoration costs €40,000-€80,000 when done to a high standard using professional services. DIY can reduce this significantly, but not as much as you'd think — parts still cost money, and your time has value even if you don't bill for it.</p>

<p>Crucially, restoration often costs more than the finished car's value. This is financially acceptable if you understand it upfront and are in it for the experience. It's devastating if you expected to break even.</p>

<h2>Creating Your Budget Framework</h2>

<h3>Step 1: Define Your End Goal</h3>
<p>Be specific. "Restored" means different things:</p>
<ul>
<li><strong>Driver quality:</strong> Mechanically sound, presentable, but not show-perfect</li>
<li><strong>Show quality:</strong> Every detail correct, no compromises</li>
<li><strong>Concours:</strong> Better than factory, period-correct in every detail</li>
</ul>
<p>Each level roughly doubles the cost of the previous one.</p>

<h3>Step 2: Full Disassembly Assessment</h3>
<p>You cannot accurately budget a restoration without fully disassembling the car first. Hidden rust, previous accident damage, and incorrect parts only reveal themselves once covers are removed.</p>

<p>Budget the disassembly phase separately: allow 40-60 hours for a typical project car, or €2,000-4,000 at shop rates.</p>

<h3>Step 3: Categorize and Prioritize</h3>
<p>Divide work into categories:</p>

<ol>
<li><strong>Safety critical:</strong> Brakes, steering, structural integrity, seatbelts</li>
<li><strong>Mechanical function:</strong> Engine, transmission, suspension, electrical</li>
<li><strong>Aesthetic:</strong> Paint, interior, chrome, trim</li>
<li><strong>Perfectionism:</strong> Matching numbers, period details, showing class compliance</li>
</ol>

<p>Phase your spending through these priorities. A driveable car with original paint is more satisfying than a stripped shell with a perfect engine sitting on a workbench.</p>

<h2>Cost Categories in Detail</h2>

<h3>Metalwork and Body (30-40% of budget)</h3>
<p>This is where restoration dreams die. Significant rust repair can consume your entire budget before you touch mechanical work.</p>

<ul>
<li>Floor pan replacement: €1,500-5,000</li>
<li>Sill/rocker panel replacement: €1,000-3,000 per side</li>
<li>Wheel arch repair: €500-1,500 per corner</li>
<li>Full respray (quality work): €8,000-20,000</li>
</ul>

<h3>Mechanical Restoration (25-35% of budget)</h3>
<ul>
<li>Engine rebuild: €3,000-10,000 depending on complexity</li>
<li>Transmission rebuild: €1,500-4,000</li>
<li>Complete brake system: €1,000-2,500</li>
<li>Suspension refresh: €1,500-4,000</li>
<li>Fuel system rebuild: €500-1,500</li>
</ul>

<h3>Interior (15-20% of budget)</h3>
<ul>
<li>Full leather upholstery: €4,000-10,000</li>
<li>Cloth upholstery: €2,000-5,000</li>
<li>Carpet set: €300-800</li>
<li>Headliner: €400-1,000</li>
<li>Dashboard restoration: €1,000-3,000</li>
</ul>

<h3>Electrical (10-15% of budget)</h3>
<ul>
<li>Complete rewire: €1,500-4,000</li>
<li>Instrument cluster restoration: €500-2,000</li>
<li>Lights and switches: €500-1,500</li>
</ul>

<h2>The 30% Rule</h2>

<p>Whatever budget you calculate, add 30% for contingencies. This isn't pessimism — it's realism based on countless projects. You will find problems you didn't expect. Parts will cost more than quoted. Work will take longer than estimated.</p>

<h2>Cost Control Strategies</h2>

<h3>Buy Smart</h3>
<ul>
<li>Start with the best base car you can afford — cutting corners on purchase price costs more in restoration</li>
<li>Complete cars cost less to restore than baskets of parts</li>
<li>Rust-free examples from dry climates can save €10,000+ in metalwork</li>
</ul>

<h3>Source Parts Strategically</h3>
<ul>
<li>New reproduction parts for wear items</li>
<li>NOS (new old stock) for rare components</li>
<li>Quality used parts from parting-out donors</li>
<li>Club networks often know who has what</li>
</ul>

<h3>DIY Wisely</h3>
<p>Good DIY candidates:</p>
<ul>
<li>Disassembly and reassembly</li>
<li>Parts cleaning and minor restoration</li>
<li>Interior installation</li>
<li>Basic mechanical work</li>
</ul>

<p>Leave to professionals:</p>
<ul>
<li>Structural metalwork (safety critical)</li>
<li>Paint and bodywork (skill-intensive)</li>
<li>Engine machining</li>
<li>Upholstery (unless you're training for it)</li>
</ul>

<h2>Tracking and Adjusting</h2>

<p>Keep detailed records of every expense. Spreadsheets work; dedicated apps work better. Review spending monthly against your plan. When overruns happen — and they will — decide consciously whether to accept them or adjust scope elsewhere.</p>

<p>The successful restoration is the one that gets finished. Scope control, realistic budgeting, and disciplined execution matter more than having unlimited funds.</p>

<h2>When to Buy Restored Instead</h2>

<p>Sometimes the math says: don't restore, buy finished. If restoration costs would exceed the value of a comparable restored example, consider:</p>

<ul>
<li>Buying someone else's completed project at fair market value</li>
<li>Choosing a more common model where parts are affordable</li>
<li>Accepting a lower restoration standard that matches your budget</li>
</ul>

<p>There's no shame in the financial reality. The classic car hobby is about enjoyment — not bankruptcy.</p>
`,
    contentRo: `
<p>"Voi face doar o restaurare ușoară" — ultimele cuvinte celebre ale fiecărui proprietar de mașină proiect care a descoperit ulterior că "reîmprospătarea minoră" consumase ani și zeci de mii de euro. Extinderea scopului restaurării este reală, și singura apărare este planificarea riguroasă.</p>

<h2>Înțelegerea Costurilor Reale</h2>

<p>Restaurarea medie a unei mașini clasice costă 40.000-80.000 € când este făcută la un standard înalt folosind servicii profesionale. DIY poate reduce aceasta semnificativ, dar nu atât de mult pe cât ai crede — piesele tot costă bani, și timpul tău are valoare chiar dacă nu-l facturezi.</p>

<p>Crucial, restaurarea costă adesea mai mult decât valoarea mașinii finalizate. Aceasta este acceptabilă financiar dacă o înțelegi din start și ești în aceasta pentru experiență. Este devastator dacă te așteptai să ieși pe zero.</p>

<h2>Crearea Cadrului Tău de Buget</h2>

<h3>Pasul 1: Definește Obiectivul Tău Final</h3>
<p>Fii specific. "Restaurat" înseamnă lucruri diferite:</p>
<ul>
<li><strong>Calitate de condus:</strong> Solid mecanic, prezentabil, dar nu perfect pentru expoziții</li>
<li><strong>Calitate de expoziție:</strong> Fiecare detaliu corect, fără compromisuri</li>
<li><strong>Concurs:</strong> Mai bun decât din fabrică, corect pentru perioadă în fiecare detaliu</li>
</ul>
<p>Fiecare nivel dublează aproximativ costul celui anterior.</p>

<h3>Pasul 2: Evaluare prin Dezasamblare Completă</h3>
<p>Nu poți bugeta cu acuratețe o restaurare fără a dezasambla complet mașina mai întâi. Rugina ascunsă, daunele anterioare de accident și piesele incorecte se dezvăluie doar odată ce capacele sunt îndepărtate.</p>

<p>Bugetează faza de dezasamblare separat: alocă 40-60 ore pentru o mașină proiect tipică, sau 2.000-4.000 € la tarife de atelier.</p>

<h3>Pasul 3: Clasifică și Prioritizează</h3>
<p>Împarte munca în categorii:</p>

<ol>
<li><strong>Critic pentru siguranță:</strong> Frâne, direcție, integritate structurală, centuri de siguranță</li>
<li><strong>Funcție mecanică:</strong> Motor, transmisie, suspensie, electric</li>
<li><strong>Estetic:</strong> Vopsea, interior, crom, ornamente</li>
<li><strong>Perfecționism:</strong> Numere originale, detalii de perioadă, conformitate pentru expoziții</li>
</ol>

<p>Fazează cheltuielile prin aceste priorități. O mașină care poate fi condusă cu vopsea originală este mai satisfăcătoare decât o caroserie dezbrăcată cu un motor perfect stând pe un banc de lucru.</p>

<h2>Categorii de Costuri în Detaliu</h2>

<h3>Tinichigerie și Caroserie (30-40% din buget)</h3>
<p>Aici mor visurile de restaurare. Reparațiile semnificative de rugină pot consuma întregul tău buget înainte de a atinge lucrările mecanice.</p>

<ul>
<li>Înlocuire podea: 1.500-5.000 €</li>
<li>Înlocuire praguri: 1.000-3.000 € per parte</li>
<li>Reparație arcade roți: 500-1.500 € per colț</li>
<li>Revopsire completă (lucru de calitate): 8.000-20.000 €</li>
</ul>

<h3>Restaurare Mecanică (25-35% din buget)</h3>
<ul>
<li>Reconstrucție motor: 3.000-10.000 € în funcție de complexitate</li>
<li>Reconstrucție transmisie: 1.500-4.000 €</li>
<li>Sistem complet de frânare: 1.000-2.500 €</li>
<li>Reîmprospătare suspensie: 1.500-4.000 €</li>
<li>Reconstrucție sistem de combustibil: 500-1.500 €</li>
</ul>

<h3>Interior (15-20% din buget)</h3>
<ul>
<li>Tapițerie completă din piele: 4.000-10.000 €</li>
<li>Tapițerie din țesătură: 2.000-5.000 €</li>
<li>Set covoare: 300-800 €</li>
<li>Plafoniera: 400-1.000 €</li>
<li>Restaurare bord: 1.000-3.000 €</li>
</ul>

<h3>Electric (10-15% din buget)</h3>
<ul>
<li>Recablare completă: 1.500-4.000 €</li>
<li>Restaurare ceas bord: 500-2.000 €</li>
<li>Lumini și întrerupătoare: 500-1.500 €</li>
</ul>

<h2>Regula de 30%</h2>

<p>Orice buget calculezi, adaugă 30% pentru contingențe. Aceasta nu este pesimism — este realism bazat pe nenumărate proiecte. Vei găsi probleme pe care nu le așteptai. Piesele vor costa mai mult decât s-a ofertat. Munca va dura mai mult decât s-a estimat.</p>

<h2>Strategii de Control al Costurilor</h2>

<h3>Cumpără Inteligent</h3>
<ul>
<li>Începe cu cea mai bună mașină de bază pe care ți-o permiți — reducerea la prețul de achiziție costă mai mult în restaurare</li>
<li>Mașinile complete costă mai puțin de restaurat decât coșurile de piese</li>
<li>Exemplarele fără rugină din climate uscate pot economisi 10.000+ € în tinichigerie</li>
</ul>

<h3>Procură Piese Strategic</h3>
<ul>
<li>Piese de reproducere noi pentru articolele de uzură</li>
<li>NOS (stoc vechi nou) pentru componentele rare</li>
<li>Piese folosite de calitate de la donatori în curs de dezmembrare</li>
<li>Rețelele de cluburi știu adesea cine are ce</li>
</ul>

<h3>DIY cu Înțelepciune</h3>
<p>Candidați buni pentru DIY:</p>
<ul>
<li>Dezasamblare și reasamblare</li>
<li>Curățarea pieselor și restaurare minoră</li>
<li>Instalare interior</li>
<li>Lucru mecanic de bază</li>
</ul>

<p>Lasă profesioniștilor:</p>
<ul>
<li>Tinichigerie structurală (critic pentru siguranță)</li>
<li>Vopsea și lucrări de caroserie (intensiv în abilități)</li>
<li>Prelucrare motor</li>
<li>Tapițerie (dacă nu te antrenezi pentru aceasta)</li>
</ul>

<h2>Urmărire și Ajustare</h2>

<p>Păstrează înregistrări detaliate ale fiecărei cheltuieli. Foile de calcul funcționează; aplicațiile dedicate funcționează mai bine. Revizuiește lunar cheltuielile față de planul tău. Când apar depășiri — și vor apărea — decide conștient dacă să le accepți sau să ajustezi scopul în altă parte.</p>

<p>Restaurarea de succes este cea care se finalizează. Controlul scopului, bugetarea realistă și execuția disciplinată contează mai mult decât a avea fonduri nelimitate.</p>

<h2>Când să Cumperi Restaurat În Schimb</h2>

<p>Uneori matematica spune: nu restaura, cumpără finalizat. Dacă costurile de restaurare ar depăși valoarea unui exemplar restaurat comparabil, ia în considerare:</p>

<ul>
<li>Cumpărarea proiectului finalizat al altcuiva la valoarea corectă de piață</li>
<li>Alegerea unui model mai comun unde piesele sunt accesibile</li>
<li>Acceptarea unui standard de restaurare mai scăzut care să corespundă bugetului tău</li>
</ul>

<p>Nu există rușine în realitatea financiară. Hobby-ul mașinilor clasice este despre plăcere — nu despre faliment.</p>
`,
  },
  {
    slug: 'classic-car-market-trends-2025',
    category: 'market-insights',
    tags: ['market', 'trends', '2025', 'investment'],
    readingTime: 5,
    publishedAt: daysAgo(68), // 68 days ago
    titleEn: 'Classic Car Market Trends: What\'s Selling in 2025',
    titleRo: 'Tendințe pe Piața Mașinilor Clasice: Ce Se Vinde în 2025',
    excerptEn: 'The classic car market is evolving. New collectors are reshaping demand while traditional segments stabilize. Here\'s what the data tells us.',
    excerptRo: 'Piața mașinilor clasice evoluează. Noii colecționari remodelează cererea în timp ce segmentele tradiționale se stabilizează. Iată ce ne spun datele.',
    metaTitleEn: 'Classic Car Market Trends 2025 | What\'s Selling & Investment Outlook',
    metaTitleRo: 'Tendințe Piață Mașini Clasice 2025 | Ce Se Vinde și Perspective de Investiție',
    metaDescriptionEn: 'Analysis of 2025 classic car market trends. Discover which segments are appreciating, what new collectors are buying, and where the market is heading.',
    metaDescriptionRo: 'Analiză a tendințelor pieței mașinilor clasice în 2025. Descoperă ce segmente se apreciază, ce cumpără noii colecționari și încotro se îndreaptă piața.',
    contentEn: `
<p>The classic car market in 2025 continues its evolution from pandemic-era highs to a more nuanced, segment-specific landscape. Online sales now represent over 50% of the market by volume, changing how cars are bought and sold. Meanwhile, generational shifts are redefining which cars collectors want.</p>

<h2>The Numbers: Market Overview</h2>

<p>Global classic and collector car auction sales reached approximately €4.3 billion in 2024, with steady growth continuing into 2025. Key observations:</p>

<ul>
<li><strong>Online auction volume up 12%</strong> year-over-year</li>
<li><strong>Average transaction values stabilizing</strong> after 2021-2022 peaks</li>
<li><strong>Sub-€50,000 segment</strong> showing strongest transaction growth</li>
<li><strong>Pre-1970 vehicles</strong> experiencing gentle price softening</li>
<li><strong>1980s-1990s cars</strong> continuing appreciation</li>
</ul>

<h2>Generational Shift in Collecting</h2>

<p>The most significant market force is demographic. Baby Boomers, who dominated classic car collecting for decades, are aging out of the market. Gen X and Millennials are taking over — and they want different cars.</p>

<h3>Rising Stars</h3>
<ul>
<li><strong>1990s Japanese sports cars:</strong> Mazda MX-5, Honda NSX, Toyota Supra</li>
<li><strong>Hot hatches:</strong> Peugeot 205 GTI, VW Golf GTI Mk2, Renault 5 Turbo</li>
<li><strong>Youngtimers:</strong> BMW E30/E36, Mercedes W124, Porsche 964/993</li>
<li><strong>Affordable exotics:</strong> Ferrari 348, Lotus Esprit, Porsche 944 Turbo</li>
</ul>

<h3>Softening Segments</h3>
<ul>
<li><strong>American muscle:</strong> Still selling, but no longer commanding pandemic premiums</li>
<li><strong>Pre-war cars:</strong> Buyer pool contracting as specialized collectors age</li>
<li><strong>1950s chrome-era:</strong> Strong resistance from younger buyers to maintenance complexity</li>
</ul>

<h2>The Online Revolution</h2>

<p>Online platforms have democratized the market. Buyers in Bucharest can now bid on cars in Barcelona or Berlin with the same ease as locals. This creates opportunity but also price convergence — regional bargains are harder to find when everyone sees everything.</p>

<p>For sellers, online reach expands your buyer pool dramatically. The right buyer for a niche vehicle might be anywhere in Europe. Platforms like Finds connect sellers across the EU, matching vehicles with collectors who specifically want them.</p>

<h2>Investment Perspective</h2>

<p>We're cautious about treating classic cars as pure investments. The market is illiquid, transaction costs are high, and carrying costs (insurance, storage, maintenance) eat into returns.</p>

<p>That said, certain segments show investment merit:</p>

<ul>
<li><strong>Rare sports cars from respected marques</strong> — limited supply meets sustained demand</li>
<li><strong>Documented, matching-numbers examples</strong> — provenance commands premiums</li>
<li><strong>Cars on the cusp of collector recognition</strong> — 1990s Japanese offers potential</li>
</ul>

<p>The worst investment? Heavily modified common cars, or restored examples where restoration cost exceeds market value.</p>

<h2>What We're Watching</h2>

<h3>Electrification Impact</h3>
<p>As EVs dominate new car sales, will enthusiasm for combustion classics increase or decrease? Current signals suggest increased nostalgia value for characterful engines.</p>

<h3>Regulatory Pressure</h3>
<p>Urban emission zones and potential restrictions on historic vehicles remain a concern. Well-maintained classics typically receive exemptions, but the regulatory environment bears monitoring.</p>

<h3>Parts Availability</h3>
<p>The aftermarket parts industry is robust, with 3D printing and small-batch manufacturing making previously unobtainable components available again. This supports values of cars that were once parts-availability nightmares.</p>

<h2>Buying Wisely in 2025</h2>

<p>Our recommendations for collectors entering or expanding in the current market:</p>

<ol>
<li><strong>Buy what you love.</strong> Market predictions are unreliable; personal enjoyment is certain.</li>
<li><strong>Quality over rarity.</strong> A well-sorted common model beats a neglected rare one.</li>
<li><strong>Documentation matters.</strong> Service history, photos, and ownership records add value.</li>
<li><strong>Factor in running costs.</strong> That €20,000 car might need €5,000 annually to maintain.</li>
<li><strong>Buy from platforms you trust.</strong> Verification and buyer protection save money long-term.</li>
</ol>

<p>The classic car market remains vibrant, just more discerning. Quality, provenance, and condition matter more than ever. For buyers willing to do their homework and buy carefully, excellent opportunities exist at every price point.</p>
`,
    contentRo: `
<p>Piața mașinilor clasice în 2025 își continuă evoluția de la maximele din era pandemiei către un peisaj mai nuanțat, specific pe segmente. Vânzările online reprezintă acum peste 50% din piață ca volum, schimbând modul în care mașinile sunt cumpărate și vândute. Între timp, schimbările generaționale redefinesc ce mașini vor colecționarii.</p>

<h2>Cifrele: Prezentare Generală a Pieței</h2>

<p>Vânzările globale de licitații de mașini clasice și de colecție au atins aproximativ 4,3 miliarde € în 2024, cu creștere constantă continuând în 2025. Observații cheie:</p>

<ul>
<li><strong>Volumul licitațiilor online crescut cu 12%</strong> față de anul precedent</li>
<li><strong>Valorile medii ale tranzacțiilor se stabilizează</strong> după vârfurile din 2021-2022</li>
<li><strong>Segmentul sub 50.000 €</strong> arată cea mai puternică creștere a tranzacțiilor</li>
<li><strong>Vehiculele de dinaintea anilor 1970</strong> experimentează o ușoară scădere a prețurilor</li>
<li><strong>Mașinile din anii 1980-1990</strong> continuă aprecierea</li>
</ul>

<h2>Schimbare Generațională în Colecționare</h2>

<p>Cea mai semnificativă forță de piață este demografică. Baby Boomers, care au dominat colecționarea de mașini clasice timp de decenii, ies din piață odată cu vârsta. Gen X și Millennials preiau conducerea — și vor mașini diferite.</p>

<h3>Vedete în Ascensiune</h3>
<ul>
<li><strong>Mașini sport japoneze din anii 1990:</strong> Mazda MX-5, Honda NSX, Toyota Supra</li>
<li><strong>Hot hatch-uri:</strong> Peugeot 205 GTI, VW Golf GTI Mk2, Renault 5 Turbo</li>
<li><strong>Youngtimers:</strong> BMW E30/E36, Mercedes W124, Porsche 964/993</li>
<li><strong>Exotice accesibile:</strong> Ferrari 348, Lotus Esprit, Porsche 944 Turbo</li>
</ul>

<h3>Segmente în Scădere</h3>
<ul>
<li><strong>Muscle car american:</strong> Încă se vând, dar nu mai comandă primele din pandemie</li>
<li><strong>Mașini de dinainte de război:</strong> Grupul de cumpărători se contractă pe măsură ce colecționarii specializați îmbătrânesc</li>
<li><strong>Era cromată a anilor 1950:</strong> Rezistență puternică din partea cumpărătorilor mai tineri la complexitatea întreținerii</li>
</ul>

<h2>Revoluția Online</h2>

<p>Platformele online au democratizat piața. Cumpărătorii din București pot acum să liciteze pentru mașini în Barcelona sau Berlin cu aceeași ușurință ca localnicii. Aceasta creează oportunitate dar și convergență de prețuri — chilipirurile regionale sunt mai greu de găsit când toată lumea vede totul.</p>

<p>Pentru vânzători, acoperirea online îți extinde dramatic grupul de cumpărători. Cumpărătorul potrivit pentru un vehicul de nișă ar putea fi oriunde în Europa. Platforme precum Finds conectează vânzătorii din toată UE, potrivind vehiculele cu colecționarii care le doresc specific.</p>

<h2>Perspectiva de Investiție</h2>

<p>Suntem precauți în a trata mașinile clasice ca investiții pure. Piața este nelichidă, costurile de tranzacție sunt ridicate, și costurile de deținere (asigurare, depozitare, întreținere) mănâncă din randamente.</p>

<p>Acestea fiind spuse, anumite segmente arată merit de investiție:</p>

<ul>
<li><strong>Mașini sport rare de la mărci respectate</strong> — oferta limitată întâlnește cererea susținută</li>
<li><strong>Exemplare documentate, cu numere originale</strong> — proveniența comandă prime</li>
<li><strong>Mașini în pragul recunoașterii colecționarilor</strong> — modelele japoneze din anii 1990 oferă potențial</li>
</ul>

<p>Cea mai proastă investiție? Mașini comune puternic modificate, sau exemplare restaurate unde costul restaurării depășește valoarea de piață.</p>

<h2>Ce Urmărim</h2>

<h3>Impactul Electrificării</h3>
<p>Pe măsură ce EV-urile domină vânzările de mașini noi, va crește sau va scădea entuziasmul pentru clasicele cu combustie? Semnalele actuale sugerează o valoare crescută de nostalgie pentru motoarele cu caracter.</p>

<h3>Presiunea Reglementară</h3>
<p>Zonele urbane cu emisii și potențialele restricții pentru vehiculele istorice rămân o preocupare. Clasicele bine întreținute primesc de obicei scutiri, dar mediul de reglementare merită monitorizat.</p>

<h3>Disponibilitatea Pieselor</h3>
<p>Industria pieselor aftermarket este robustă, cu imprimare 3D și producție în loturi mici făcând componentele anterior imposibil de obținut disponibile din nou. Aceasta susține valorile mașinilor care erau odinioară coșmaruri din punct de vedere al disponibilității pieselor.</p>

<h2>Cumpărare Înțeleaptă în 2025</h2>

<p>Recomandările noastre pentru colecționarii care intră sau se extind pe piața actuală:</p>

<ol>
<li><strong>Cumpără ce iubești.</strong> Predicțiile de piață sunt nesigure; plăcerea personală este certă.</li>
<li><strong>Calitate peste raritate.</strong> Un model comun bine pus la punct bate un model rar neglijat.</li>
<li><strong>Documentația contează.</strong> Istoricul de service, fotografiile și înregistrările de proprietate adaugă valoare.</li>
<li><strong>Ia în calcul costurile de funcționare.</strong> Acea mașină de 20.000 € ar putea necesita 5.000 € anual pentru întreținere.</li>
<li><strong>Cumpără de la platforme în care ai încredere.</strong> Verificarea și protecția cumpărătorului economisesc bani pe termen lung.</li>
</ol>

<p>Piața mașinilor clasice rămâne vibrantă, doar mai selectivă. Calitatea, proveniența și starea contează mai mult ca niciodată. Pentru cumpărătorii dispuși să-și facă temele și să cumpere cu grijă, există oportunități excelente la fiecare punct de preț.</p>
`,
  },
]

async function main() {
  console.log('Seeding blog data...')

  // Create authors
  for (const authorData of authors) {
    await prisma.blogAuthor.upsert({
      where: { slug: authorData.slug },
      update: authorData,
      create: authorData,
    })
    console.log(`Created/updated author: ${authorData.name}`)
  }

  // Get author IDs
  const authorMap = new Map<string, string>()
  for (const author of authors) {
    const dbAuthor = await prisma.blogAuthor.findUnique({ where: { slug: author.slug } })
    if (dbAuthor) {
      authorMap.set(author.slug, dbAuthor.id)
    }
  }

  // Author assignments for posts
  const postAuthorAssignments: Record<string, string> = {
    'first-time-auction-bidding-guide': 'marcus-webb',
    'barn-find-evaluation-guide': 'thomas-brenner',
    'avoid-classic-car-scams': 'marcus-webb',
    'auction-vs-private-sale-sellers-guide': 'elena-vasquez',
    'project-car-restoration-budget-guide': 'thomas-brenner',
    'classic-car-market-trends-2025': 'elena-vasquez',
  }

  // Create blog posts
  for (const postData of blogPosts) {
    const authorSlug = postAuthorAssignments[postData.slug]
    const authorId = authorMap.get(authorSlug)

    if (!authorId) {
      console.error(`Author not found for post: ${postData.slug}`)
      continue
    }

    await prisma.blogPost.upsert({
      where: { slug: postData.slug },
      update: {
        ...postData,
        authorId,
        status: 'PUBLISHED',
      },
      create: {
        ...postData,
        authorId,
        status: 'PUBLISHED',
      },
    })
    console.log(`Created/updated post: ${postData.slug}`)
  }

  console.log('Blog seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
