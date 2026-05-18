export interface BoroughGuide {
  slug: string
  name: string
  tagline: string
  postcodes: string[]
  description: string
  history: string
  landmarks: { name: string; description: string; image?: string }[]
  hiddenGems: { name: string; description: string; image?: string }[]
  localInsights: string[]
  transport: string
  bestFor: string[]
  avoidIf: string[]
  heroImage?: string
}

export const boroughGuides: BoroughGuide[] = [
  {
    slug: "city-of-london",
    heroImage: "/boroughs/city-of-london.jpg",
    name: "City of London",
    tagline: "The Square Mile — ancient streets, soaring towers, and 2,000 years of history",
    postcodes: ["EC1", "EC2", "EC3", "EC4"],
    description: "The City of London is simultaneously the oldest and most modern part of the capital — a one-square-mile powerhouse where Roman walls stand in the shadow of glass skyscrapers.",
    history: "Founded by the Romans as Londinium around 43 AD, the City has been the beating heart of British commerce ever since. After the Great Fire of 1666, Christopher Wren rebuilt it — leaving St Paul's Cathedral and 51 churches.",
    landmarks: [
      { name: "St Paul's Cathedral", description: "Wren's masterpiece and London's spiritual centre. Climb the dome for extraordinary city views." },
      { name: "The Barbican Centre", description: "Europe's largest multi-arts centre, set within a striking Brutalist residential estate." },
      { name: "Bank of England Museum", description: "Free and fascinating — hold a gold bar and trace 300 years of financial history." },
      { name: "Tower of London", description: "Nearly 1,000 years of royal history, the Crown Jewels, and the famous Beefeaters." },
    ],
    hiddenGems: [
      { name: "Leadenhall Market", description: "A stunning Victorian covered market — the setting for Diagon Alley in Harry Potter. Best on weekday lunchtimes." },
      { name: "St Dunstan-in-the-East", description: "A ruined Christopher Wren church turned into a magical public garden." },
      { name: "Roman Amphitheatre", description: "Beneath the Guildhall Art Gallery, Roman remains lie preserved. Free to visit." },
    ],
    localInsights: [
      "The City empties on weekends — restaurants are often closed. Great for tourists, challenging for residents.",
      "The Barbican estate is the primary residential area with a strong community.",
      "Crossrail transformed connectivity — Liverpool Street and Farringdon now provide rapid access across London.",
    ],
    transport: "Exceptional. Served by Bank, Monument, Liverpool Street, Cannon Street, Farringdon, Moorgate, and Blackfriars.",
    bestFor: ["Finance professionals", "History lovers", "Barbican arts enthusiasts"],
    avoidIf: ["You want a lively neighbourhood feel", "You need extensive local amenities on weekends"],
  },
  {
    slug: "westminster",
    heroImage: "/boroughs/westminster.jpg",
    name: "Westminster",
    tagline: "Power, pageantry, and some of London's most coveted addresses",
    postcodes: ["SW1", "W1", "WC2"],
    description: "Westminster is where Britain's political, cultural, and royal life converges. From Buckingham Palace to the Houses of Parliament, Mayfair to Soho, this borough encompasses some of the most recognisable postcodes on earth.",
    history: "Westminster grew around a Benedictine abbey founded in the 10th century. Mayfair was developed in the 18th century as an aristocratic enclave, while Soho evolved as London's bohemian quarter.",
    landmarks: [
      { name: "Buckingham Palace", description: "The monarch's London residence. Watch the Changing of the Guard and stroll through St James's Park." },
      { name: "Houses of Parliament", description: "The iconic Gothic Revival palace on the Thames. Book a free tour through your MP." },
      { name: "Westminster Abbey", description: "A millennium of royal coronations, weddings, and funerals in one extraordinary Gothic church." },
      { name: "National Gallery", description: "One of the world's great art collections, overlooking Trafalgar Square. Free entry." },
    ],
    hiddenGems: [
      { name: "Goodwin's Court", description: "A hidden alley off St Martin's Lane with perfectly preserved 17th-century shopfronts." },
      { name: "St James's Park pelicans", description: "The park's resident pelicans are fed daily at 2:30pm near Duck Island." },
    ],
    localInsights: [
      "Mayfair and Belgravia are among the most expensive addresses globally.",
      "Pimlico offers some of the best value Victorian terraces in central London.",
      "Parking is extremely limited — most residents rely entirely on public transport.",
    ],
    transport: "Outstanding. Victoria, Westminster, Green Park, Oxford Circus, Charing Cross, and Waterloo all serve the borough.",
    bestFor: ["Government and media workers", "Theatre lovers", "Fine dining enthusiasts"],
    avoidIf: ["You're on a budget", "You want a village feel", "You dislike tourist crowds"],
  },
  {
    slug: "camden",
    heroImage: "/boroughs/camden.jpg",
    name: "Camden",
    tagline: "Counterculture capital with a beating heart of markets, music, and canal life",
    postcodes: ["NW1", "NW3", "NW5", "NW6"],
    description: "Camden is London's most creatively charged borough — a place where punks and professionals coexist, where the canal towpath leads from markets to Primrose Hill.",
    history: "Camden Town grew rapidly in the 19th century with the arrival of the railway and the Regent's Canal. Hampstead has been a wealthy village since Georgian times, attracting writers and artists.",
    landmarks: [
      { name: "Camden Market", description: "Four interconnected markets spanning the canal. Go on weekdays to avoid weekend crowds.", image: "/boroughs/places/camden-camden-market.jpg" },
      { name: "Regent's Park", description: "One of London's finest royal parks — home to London Zoo and an open-air theatre.", image: "/boroughs/places/camden-regent-s-park.jpg" },
      { name: "Primrose Hill", description: "The best panoramic view of central London — especially magical at sunset.", image: "/boroughs/places/camden-primrose-hill.jpg" },
      { name: "British Library", description: "Home to the Magna Carta and Shakespeare's First Folio. Free entry.", image: "/boroughs/places/camden-british-library.jpg" },
    ],
    hiddenGems: [
      { name: "Regent's Canal towpath", description: "Walk or cycle from Little Venice to Victoria Park — a 9-mile escape through the city's back garden.", image: "/boroughs/places/camden-regent-s-canal-towpath.jpg" },
      { name: "Holly Bush pub, Hampstead", description: "One of London's finest historic pubs, hidden near Hampstead Heath.", image: "/boroughs/places/camden-holly-bush-pub-hampstead.jpg" },
    ],
    localInsights: [
      "Hampstead and Belsize Park are among London's most desirable — and expensive — residential areas.",
      "Kentish Town offers better value and is rapidly gentrifying.",
      "Hampstead Heath offers 800 acres of wild parkland with swimming ponds within Zone 2.",
    ],
    transport: "Excellent. Northern line (Edgware and High Barnet branches), Overground, and Thameslink.",
    bestFor: ["Creative professionals", "Families", "Nature lovers", "Music and arts enthusiasts"],
    avoidIf: ["You want peace near markets", "You need a car", "You dislike hills"],
  },
  {
    slug: "islington",
    heroImage: "/boroughs/islington.jpg",
    name: "Islington",
    tagline: "Georgian terraces, political passions, and the best pub crawl in London",
    postcodes: ["N1", "EC1V", "N5", "N7"],
    description: "Islington is one of London's most characterful inner-city boroughs — beautiful Georgian architecture, vibrant food and culture scenes, and deeply held political convictions.",
    history: "Islington was a fashionable spa resort in the 17th and 18th centuries. The 20th century brought decline, then from the 1960s, gentrification — making it one of the most politicised neighbourhoods in London.",
    landmarks: [
      { name: "Upper Street", description: "One of London's best high streets — independent shops, outstanding restaurants, and the Almeida Theatre." },
      { name: "Almeida Theatre", description: "A world-class fringe theatre in a converted Victorian literary institute." },
      { name: "Chapel Market", description: "A traditional street market operating since 1882." },
    ],
    hiddenGems: [
      { name: "Barnsbury", description: "One of London's most beautiful residential enclaves — Regency squares without the Notting Hill price tag." },
      { name: "Camden Passage", description: "Not in Camden — this antiques market in Islington is one of London's best-kept shopping secrets." },
    ],
    localInsights: [
      "The side streets around Barnsbury and Canonbury are where the real Islington lives.",
      "N7 and parts of N5 offer much better value than Angel.",
      "Islington has one of the highest concentrations of restaurants per capita in London.",
    ],
    transport: "Very good. Victoria line at Highbury & Islington and Angel, Northern line at Angel.",
    bestFor: ["Young professionals", "Foodies", "Theatre enthusiasts", "City workers"],
    avoidIf: ["You need a garden", "You want suburban quiet", "You're very budget-conscious"],
  },
  {
    slug: "hackney",
    heroImage: "/boroughs/hackney.jpg",
    name: "Hackney",
    tagline: "East London's creative powerhouse — raw, vibrant, and unapologetically itself",
    postcodes: ["E8", "E9", "E5", "N16", "E2"],
    description: "Hackney is the beating heart of East London's creative scene — transformed from post-industrial decline to one of the most culturally vibrant places in Europe.",
    history: "Once prosperous market gardens, Hackney industrialised in the 19th century. The 20th century brought waves of Afro-Caribbean, Turkish, Orthodox Jewish, and Vietnamese communities.",
    landmarks: [
      { name: "Broadway Market", description: "London's finest Saturday food market — arrive by 10am. The surrounding streets are wonderful year-round." },
      { name: "London Fields Lido", description: "A heated outdoor 50m swimming pool open year-round." },
      { name: "Victoria Park", description: "East London's finest green space with a boating lake and summer festivals." },
      { name: "Hackney Wick", description: "Europe's highest concentration of artists' studios, plus extraordinary street art and canal-side bars." },
    ],
    hiddenGems: [
      { name: "Abney Park Cemetery", description: "A beautiful Victorian garden cemetery and nature reserve." },
      { name: "Clissold Park", description: "A wonderful Victorian park in Stoke Newington with a café and deer enclosure." },
    ],
    localInsights: [
      "Hackney has no tube stations — it relies on the Overground, buses, and cycling.",
      "Dalston is the nightlife hub — particularly good for LGBTQ+ venues and Turkish restaurants.",
      "Stoke Newington is more family-oriented with excellent primary schools.",
    ],
    transport: "Good but different — no tube. Overground from Dalston Junction, Hackney Central, London Fields.",
    bestFor: ["Cyclists", "Creative professionals", "Nightlife seekers", "Families (Stoke Newington)"],
    avoidIf: ["You rely heavily on the tube", "You prefer suburban living"],
  },
  {
    slug: "tower-hamlets",
    heroImage: "/boroughs/tower-hamlets.jpg",
    name: "Tower Hamlets",
    tagline: "Contrasts define this borough — from the City's glass towers to Brick Lane's spice markets",
    postcodes: ["E1", "E14", "E3", "E2"],
    description: "Tower Hamlets is one of London's most dynamic and culturally rich boroughs — a place of extraordinary contrasts, where Canary Wharf's financial towers, Brick Lane's Bangladeshi restaurants, Whitechapel's galleries, and the historic Docklands all sit within a single borough.",
    history: "The East End has always been London's arrival point for immigrants. Canary Wharf was built in the 1980s as a financial district to rival the City.",
    landmarks: [
      { name: "Canary Wharf", description: "Europe's largest financial centre — extraordinary architecture, especially at night." },
      { name: "Brick Lane", description: "The heart of Banglatown — excellent curry houses, vintage markets, and the Sunday market." },
      { name: "Spitalfields Market", description: "A stunning Victorian market hall with excellent independent traders." },
    ],
    hiddenGems: [
      { name: "Dennis Severs' House", description: "A Huguenot silk-weaver's townhouse in Folgate Street preserved as a living still life." },
      { name: "Columbia Road Flower Market", description: "Sunday mornings transform this Victorian street into a riot of colour and scent." },
    ],
    localInsights: [
      "Wapping and Limehouse offer dramatic converted warehouse apartments with river views.",
      "Canary Wharf has transformed into a genuine neighbourhood — no longer just an office district.",
      "The Elizabeth line has transformed connectivity — Canary Wharf to Heathrow is now 40 minutes direct.",
    ],
    transport: "Excellent — DLR, Jubilee line, Elizabeth line, Overground.",
    bestFor: ["Finance professionals", "Art lovers", "Those seeking warehouse conversions"],
    avoidIf: ["You want green space on your doorstep", "You prefer suburbia"],
  },
  {
    slug: "southwark",
    heroImage: "/boroughs/southwark.jpg",
    name: "Southwark",
    tagline: "Shakespeare's Bankside, Borough Market, and a new generation of Bermondsey cool",
    postcodes: ["SE1", "SE5", "SE15", "SE16", "SE17"],
    description: "Southwark stretches from the buzzing Bankside arts scene to the emerging cool of Bermondsey. Borough Market, Tate Modern, Shakespeare's Globe, and the Shard all sit in this single borough.",
    history: "Southwark is London's oldest suburb — its position at the south end of London Bridge made it the gateway to the capital for 2,000 years.",
    landmarks: [
      { name: "Tate Modern", description: "The world's most visited modern art gallery, in a transformed power station. Free entry." },
      { name: "Borough Market", description: "London's finest food market — go Thursday-Saturday. Arrive hungry." },
      { name: "Shakespeare's Globe", description: "A faithful reconstruction of Shakespeare's original theatre. Standing tickets are affordable." },
    ],
    hiddenGems: [
      { name: "Maltby Street Market", description: "A Saturday market under railway arches — less touristy than Borough Market, equally excellent." },
      { name: "Nunhead Cemetery", description: "One of the Magnificent Seven Victorian cemeteries — wild and hauntingly beautiful." },
    ],
    localInsights: [
      "Bermondsey has transformed — Bermondsey Street and Long Lane are among London's best dining destinations.",
      "Peckham (SE15) offers exceptional value and energy on Rye Lane.",
      "The South Bank riverside walk from Waterloo to Tower Bridge is one of the finest urban walks in Europe.",
    ],
    transport: "Very good. London Bridge, Waterloo, Borough, Bermondsey, Elephant & Castle, Canada Water.",
    bestFor: ["Arts enthusiasts", "Foodies", "City workers", "Families (Dulwich)"],
    avoidIf: ["You want quiet near Borough Market", "You want suburban calm"],
  },
  {
    slug: "lambeth",
    heroImage: "/boroughs/lambeth.jpg",
    name: "Lambeth",
    tagline: "Where the South Bank meets Brixton's vibrant soul — music, markets, and the Thames",
    postcodes: ["SW2", "SW4", "SW8", "SW9", "SE11", "SE24"],
    description: "Lambeth runs from the Embankment to Streatham, encompassing Brixton's legendary music and market scene, Clapham, Vauxhall's nightlife, and the quiet villages of Herne Hill.",
    history: "Brixton became home to a significant Caribbean community after the Windrush generation arrived at Clapham South tube in 1948. The Brixton riots of 1981 are pivotal moments in British race relations.",
    landmarks: [
      { name: "Brixton Market", description: "One of London's finest covered markets — essential for Caribbean produce, vinyl, and street food." },
      { name: "Royal Festival Hall", description: "A beloved post-war concert hall on the South Bank — free foyer events most evenings." },
      { name: "Clapham Common", description: "220 acres of south London parkland with excellent cafes and sports facilities." },
    ],
    hiddenGems: [
      { name: "Brixton Village", description: "The indoor market section has become one of London's most exciting restaurant destinations." },
      { name: "Herne Hill Velodrome", description: "The world's oldest surviving Olympic cycling velodrome, still hosting events." },
    ],
    localInsights: [
      "Brixton is gentrifying rapidly but retains its Caribbean heart.",
      "Herne Hill is Lambeth's hidden gem — a village feel, excellent schools, Brockwell Park.",
      "The area south of Brixton offers Victorian terraces at notably lower prices.",
    ],
    transport: "Good. Victoria line at Brixton, Stockwell, Clapham North/South. Northern line at Clapham Common.",
    bestFor: ["Music lovers", "Families (Herne Hill)", "LGBTQ+ community", "Those who value diversity"],
    avoidIf: ["You want guaranteed quiet evenings", "You need a car regularly"],
  },
  {
    slug: "wandsworth",
    heroImage: "/boroughs/wandsworth.jpg",
    name: "Wandsworth",
    tagline: "Riverside ambition, Battersea's renaissance, and the best park in south London",
    postcodes: ["SW11", "SW12", "SW17", "SW18"],
    description: "Wandsworth combines riverside glamour with solid south London neighbourliness. Battersea is transforming; Clapham Junction pulses with energy; Balham and Tooting are beloved family hubs.",
    history: "Battersea Power Station dominated the skyline from 1933 until its decommissioning in 1983, before its recent transformation into a luxury development.",
    landmarks: [
      { name: "Battersea Power Station", description: "Transformed into a shopping and residential complex — the art deco interiors are extraordinary." },
      { name: "Battersea Park", description: "One of London's finest riverside parks — boating lake, zen garden, and the Peace Pagoda." },
      { name: "Tooting Bec Lido", description: "Britain's largest freshwater outdoor pool — a south London institution open April-September." },
    ],
    hiddenGems: [
      { name: "Tooting Market", description: "An underrated covered market with excellent Sri Lankan and Caribbean street food." },
      { name: "Wandle Trail", description: "A 12-mile walking route following the River Wandle — largely car-free and beautiful." },
    ],
    localInsights: [
      "Wandsworth has consistently had one of London's lowest council tax rates.",
      "Battersea is transforming rapidly with the Northern line extension.",
      "Balham and Tooting are excellent family-friendly areas with strong school options.",
    ],
    transport: "Good. Northern line serves Clapham South, Balham, Tooting Bec. Northern line extension serves Battersea.",
    bestFor: ["Families", "Outdoor enthusiasts", "Value seekers near central London"],
    avoidIf: ["You want tube access everywhere", "You need East London connections"],
  },
  {
    slug: "kensington-and-chelsea",
    heroImage: "/boroughs/kensington-and-chelsea.jpg",
    name: "Kensington & Chelsea",
    tagline: "The Royal Borough — where world-class museums meet immaculate garden squares",
    postcodes: ["SW3", "SW5", "SW7", "SW10", "W8", "W11", "W14"],
    description: "The Royal Borough is London's most prestigious address — home to four world-class museums, the finest garden squares, Notting Hill's colourful houses, and the King's Road.",
    history: "Kensington Palace became a royal residence in 1689. South Kensington's Albertopolis was built as a monument to the Great Exhibition of 1851.",
    landmarks: [
      { name: "Victoria & Albert Museum", description: "The world's greatest museum of art and design. Free entry." },
      { name: "Natural History Museum", description: "An extraordinary Victorian cathedral of science. Free entry." },
      { name: "Portobello Road Market", description: "The world's largest antiques market every Saturday." },
    ],
    hiddenGems: [
      { name: "Leighton House Museum", description: "Victorian artist Lord Leighton's extraordinary home with its Arab Hall." },
      { name: "Holland Park", description: "Less well-known than Hyde Park but more beautiful — Japanese gardens and peacocks." },
    ],
    localInsights: [
      "This is the most expensive borough in the UK — the prestige is real but so is the premium.",
      "South Kensington is very international — French families love the area.",
      "Earl's Court has the best value in the borough.",
    ],
    transport: "Excellent. District and Piccadilly lines serve multiple stations.",
    bestFor: ["Museum lovers", "International buyers", "Families with young children"],
    avoidIf: ["You're on any kind of budget", "You want a diverse neighbourhood"],
  },
  {
    slug: "hammersmith-and-fulham",
    heroImage: "/boroughs/hammersmith-and-fulham.jpg",
    name: "Hammersmith & Fulham",
    tagline: "West London's understated gem — riverside living, village pubs, and excellent transport",
    postcodes: ["W6", "W12", "W14", "SW6"],
    description: "Hammersmith & Fulham sits between Chelsea and Chiswick — offering much of the charm of both without quite the price premium of either.",
    history: "The BBC moved its television centre to White City in 1960, creating a media cluster that persists today.",
    landmarks: [
      { name: "Thames Path", description: "The riverside walk from Putney Bridge to Chiswick Bridge — pubs every half mile." },
      { name: "Lyric Theatre Hammersmith", description: "One of London's finest regional theatres in a stunning Frank Matcham auditorium." },
    ],
    hiddenGems: [
      { name: "The Dove, Hammersmith", description: "One of London's most historic riverside pubs — Charles II drank here." },
      { name: "Strand-on-the-Green", description: "A beautiful 18th-century riverside street — one of west London's finest hidden villages." },
    ],
    localInsights: [
      "Fulham Road has some of West London's best independent restaurants.",
      "White City and Shepherd's Bush offer much better value than riverside areas.",
    ],
    transport: "Very good. Piccadilly, District, and Circle lines serve the borough. Overground at Shepherd's Bush.",
    bestFor: ["Media professionals", "Families", "Cyclists", "West London seekers"],
    avoidIf: ["You want East London buzz", "You want to avoid football match days"],
  },
  {
    slug: "ealing",
    heroImage: "/boroughs/ealing.jpg",
    name: "Ealing",
    tagline: "The Queen of the Suburbs — leafy, diverse, and surprisingly cosmopolitan",
    postcodes: ["W3", "W5", "W7", "W13", "UB1", "UB2"],
    description: "Ealing earned its nickname — the leafiest of London's western suburbs, with excellent parks and genuine cosmopolitan energy. The Elizabeth line has transformed its connectivity.",
    history: "Ealing Studios — the world's oldest working film studio — has been producing films since 1902. The Ealing Comedies are national treasures.",
    landmarks: [
      { name: "Ealing Studios", description: "Still producing films after 120 years — tours occasionally available." },
      { name: "Pitzhanger Manor", description: "Sir John Soane's restored country house and gallery — free entry." },
      { name: "Southall Broadway", description: "The best place in London for South Asian food, groceries, and fabrics." },
    ],
    hiddenGems: [
      { name: "Horsenden Hill", description: "A surprisingly wild hill with panoramic views across west London." },
    ],
    localInsights: [
      "Ealing Broadway's Elizabeth line connection makes the City under 20 minutes away.",
      "Southall offers extraordinary food and community culture unlike anywhere else in London.",
    ],
    transport: "Excellent. Elizabeth line at Ealing Broadway (22 mins to Bond Street), District and Central lines.",
    bestFor: ["Families", "Value seekers close to central London", "Foodies", "Elizabeth line commuters"],
    avoidIf: ["You want urban buzz", "You need central London on your doorstep"],
  },
  {
    slug: "brent",
    heroImage: "/boroughs/brent.jpg",
    name: "Brent",
    tagline: "Wembley's global ambitions, Kilburn's Irish heart, and Kensal Rise's creative cool",
    postcodes: ["NW6", "NW9", "NW10", "HA0", "HA9"],
    description: "Brent is one of London's most diverse boroughs — over 130 languages are spoken here. From Wembley Stadium to Kensal Rise, from Irish Kilburn to the Orthodox Jewish community.",
    history: "Wembley Stadium first opened in 1923 for the FA Cup Final. Kilburn has been the heart of London's Irish community since the 19th century.",
    landmarks: [
      { name: "Wembley Stadium", description: "England's national football stadium — tours available." },
      { name: "Neasden Temple", description: "Europe's largest Hindu temple, carved from 2,000 tonnes of Bulgarian limestone. Free to visit." },
    ],
    hiddenGems: [
      { name: "Paradise by Way of Kensal Green", description: "One of London's most atmospheric pubs — magnificent Victorian building with excellent music." },
    ],
    localInsights: [
      "Kensal Rise (NW10) has become one of north-west London's most sought-after areas.",
      "Wembley is being extensively redeveloped around the stadium.",
    ],
    transport: "Good. Jubilee line at Wembley, Bakerloo and Metropolitan at various stops, Overground through Kensal Rise.",
    bestFor: ["Those seeking multicultural London", "Value seekers in north-west London", "Sports lovers"],
    avoidIf: ["You want a prestigious address", "You're sensitive to event day crowds"],
  },
  {
    slug: "greenwich",
    heroImage: "/boroughs/greenwich.jpg",
    name: "Greenwich",
    tagline: "Where time begins — maritime majesty, royal parks, and south-east London's finest villages",
    postcodes: ["SE3", "SE7", "SE9", "SE10", "SE18"],
    description: "Greenwich is one of London's most historically significant boroughs — the site of the Prime Meridian, home to the finest baroque architecture in Britain.",
    history: "Henry VIII was born at Greenwich Palace. The Royal Naval College was designed by Wren and Hawksmoor in the 1690s. The Royal Observatory established Greenwich as the world's keeper of time.",
    landmarks: [
      { name: "Royal Naval College", description: "The Painted Hall alone is worth the visit — free entry." },
      { name: "National Maritime Museum", description: "The world's largest maritime museum — free." },
      { name: "Greenwich Park", description: "London's oldest Royal Park — the hilltop view over Canary Wharf is one of the capital's greatest." },
    ],
    hiddenGems: [
      { name: "Greenwich Market", description: "One of London's most pleasant covered markets — excellent arts, crafts, and food every weekend." },
      { name: "Severndroog Castle", description: "A 1784 Gothic folly on Shooter's Hill with panoramic views across five counties." },
    ],
    localInsights: [
      "Blackheath village is one of south London's most desirable areas.",
      "Woolwich is rapidly regenerating following the Elizabeth line arrival.",
      "DLR connectivity makes Greenwich attractive for finance professionals.",
    ],
    transport: "Good. DLR from Cutty Sark and Greenwich. Elizabeth line from Woolwich. National Rail from Blackheath.",
    bestFor: ["History and architecture lovers", "Families", "Finance professionals (DLR to Canary Wharf)"],
    avoidIf: ["You need fast central London tube access", "You work in West London"],
  },
  {
    slug: "lewisham",
    heroImage: "/boroughs/lewisham.jpg",
    name: "Lewisham",
    tagline: "Brockley's Victorian charm, Deptford's creative energy, and south London's best-value streets",
    postcodes: ["SE4", "SE6", "SE8", "SE12", "SE13", "SE14", "SE23"],
    description: "Lewisham is south-east London's most exciting borough for those seeking value — from the Victorian terraces of Brockley to the creative energy of Deptford and the hills of Forest Hill.",
    history: "Deptford was one of England's most important naval dockyards — where Sir Francis Drake was knighted. Brockley developed as a Victorian suburb for City workers.",
    landmarks: [
      { name: "Horniman Museum", description: "One of London's most distinctive free museums — natural history, aquarium, and musical instruments." },
    ],
    hiddenGems: [
      { name: "Deptford Market Yard", description: "A thriving artisan market in a converted railway yard — excellent street food." },
      { name: "The Rivoli Ballroom", description: "Britain's last intact 1950s ballroom — extraordinary interior, still hosting events." },
    ],
    localInsights: [
      "Brockley (SE4) now has better Victorian housing than many Zone 2 areas at a fraction of the price.",
      "Forest Hill and Sydenham offer family houses with gardens at Zone 2 flat prices.",
    ],
    transport: "Good. Overground through Brockley, Honor Oak, Forest Hill. DLR in Deptford.",
    bestFor: ["First-time buyers and young families", "Creative professionals", "Architecture lovers"],
    avoidIf: ["You want flat terrain", "You need fast tube access"],
  },
  {
    slug: "bromley",
    heroImage: "/boroughs/bromley.jpg",
    name: "Bromley",
    tagline: "David Bowie's borough and south London's most spacious, gracious suburb",
    postcodes: ["BR1", "BR2", "BR3", "BR4", "BR5", "BR6", "SE20"],
    description: "Bromley is London's largest borough and its most genuinely suburban — leafy streets, excellent schools, country parks, and genuine town character.",
    history: "H.G. Wells and David Bowie both grew up here. The Crystal Palace, destroyed by fire in 1936, stood on the ridge overlooking the borough.",
    landmarks: [
      { name: "Crystal Palace Park", description: "The site of the original Crystal Palace — the Victorian dinosaur sculptures in the lake are extraordinary." },
      { name: "Darwin's Downe House", description: "Charles Darwin's home where he wrote On the Origin of Species." },
    ],
    hiddenGems: [
      { name: "Beckenham Place Park", description: "A restored Victorian landscape with a beautiful lake and free swimming." },
    ],
    localInsights: [
      "Bromley has excellent state schools — a major driver of family moves.",
      "Crystal Palace (SE20) offers excellent value and a vibrant independent scene.",
    ],
    transport: "National Rail from Bromley South/North, Beckenham Junction Overground, Crystal Palace Overground.",
    bestFor: ["Families seeking space, schools, and value", "National Rail commuters", "Nature lovers"],
    avoidIf: ["You want urban energy", "You rely on the tube"],
  },
  {
    slug: "croydon",
    heroImage: "/boroughs/croydon.jpg",
    name: "Croydon",
    tagline: "London's southern gateway — ambitious, diverse, and genuinely undervalued",
    postcodes: ["CR0", "CR2", "CR7", "SE25"],
    description: "Croydon rewards those who look beyond the clichés. Outstanding transport links, world-class street art, and rapidly improving food and culture make this one of London's most dynamic boroughs.",
    history: "Croydon Airport (1920-1959) saw Amy Johnson, Amelia Earhart, and Charles Lindbergh fly from here.",
    landmarks: [
      { name: "Croydon Airport visitor centre", description: "One of the finest surviving Art Deco buildings in Greater London." },
    ],
    hiddenGems: [
      { name: "Surrey Street Market", description: "One of Greater London's oldest markets, operating since 1276." },
    ],
    localInsights: [
      "East Croydon to London Bridge takes 15 minutes — one of the fastest rail commutes from outer London.",
      "South Croydon and Purley are the most desirable residential areas.",
    ],
    transport: "Excellent rail. East Croydon to Victoria in 15 minutes. Tram network within the borough.",
    bestFor: ["Victoria and London Bridge commuters", "First-time buyers", "Families seeking space"],
    avoidIf: ["You want Zone 1-3 energy", "You need tube access"],
  },
  {
    slug: "merton",
    heroImage: "/boroughs/merton.jpg",
    name: "Merton",
    tagline: "Wimbledon's tennis glamour and an emerging south London scene",
    postcodes: ["SW19", "SW20", "SM4", "CR4"],
    description: "Merton is more than two weeks of tennis. Wimbledon Village is one of south-west London's most charming residential areas; the Common is extraordinary.",
    history: "The Wimbledon Championships have been held on the same site since 1877. William Morris's textile works operated in Merton until 1940.",
    landmarks: [
      { name: "Wimbledon Common", description: "One of London's finest open spaces — 460 hectares of ancient woodland with the famous Windmill." },
      { name: "Morden Hall Park", description: "A National Trust property with beautiful water meadows and a working watermill. Free entry." },
    ],
    hiddenGems: [
      { name: "Wimbledon Village", description: "An unexpected village at the top of Wimbledon Hill — excellent independent shops and pubs." },
    ],
    localInsights: [
      "Wimbledon Village is distinctly different from and more desirable than the rest of SW19.",
      "Raynes Park and South Wimbledon offer better value with similar transport access.",
    ],
    transport: "District line to Wimbledon. Northern line to South Wimbledon. National Rail from Wimbledon to Waterloo.",
    bestFor: ["Families (excellent schools and parks)", "Village character seekers"],
    avoidIf: ["You find Wimbledon fortnight disruptive", "You want East London connections"],
  },
  {
    slug: "richmond-upon-thames",
    heroImage: "/boroughs/richmond-upon-thames.jpg",
    name: "Richmond upon Thames",
    tagline: "London's most beautiful borough — deer, riverside, and the finest green spaces anywhere",
    postcodes: ["TW9", "TW10", "TW1", "TW2", "SW13", "SW14", "SW15"],
    description: "Richmond upon Thames is consistently voted the best place to live in London. Two Royal Parks, Kew Gardens, Hampton Court Palace, and a series of beautiful villages make this truly exceptional.",
    history: "Henry VII built a palace here in 1500. Kew Gardens was established in 1759 and is now a UNESCO World Heritage Site.",
    landmarks: [
      { name: "Richmond Park", description: "London's largest Royal Park — 2,500 acres of ancient woodland with 650 deer." },
      { name: "Kew Royal Botanic Gardens", description: "A UNESCO World Heritage Site with 30,000 plant species." },
    ],
    hiddenGems: [
      { name: "Petersham Meadows", description: "Cows grazing with Richmond Hill reflected in the water — one of the Thames Valley's most beautiful stretches." },
      { name: "Bushy Park", description: "Often overshadowed by Richmond Park but equally beautiful — the chestnut avenue in spring is spectacular." },
    ],
    localInsights: [
      "Richmond is consistently the most expensive outer London borough.",
      "Twickenham and Teddington offer better value while sharing the park and river access.",
    ],
    transport: "District line to Richmond. Overground to Clapham Junction. National Rail from various stations.",
    bestFor: ["Nature and outdoor enthusiasts", "Families with young children", "Cyclists"],
    avoidIf: ["You're on a tight budget", "You work in East London", "You want urban energy"],
  },
  {
    slug: "kingston-upon-thames",
    heroImage: "/boroughs/kingston-upon-thames.jpg",
    name: "Kingston upon Thames",
    tagline: "Medieval market town, riverside beauty, and the finest high street in outer London",
    postcodes: ["KT1", "KT2", "KT3"],
    description: "Kingston is the jewel of south-west outer London — a genuine ancient market town with a beautifully preserved centre and spectacular Thames riverside.",
    history: "Kingston has been a royal borough since the 10th century — seven Saxon kings were crowned at the Coronation Stone still preserved in the town centre.",
    landmarks: [
      { name: "Kingston Bridge and Riverside", description: "One of the Thames's finest stretches." },
      { name: "Hampton Court Palace", description: "Henry VIII's magnificent Tudor palace — just two miles from the town centre." },
    ],
    hiddenGems: [
      { name: "New Malden's Korean community", description: "The best Korean restaurants outside central London — extraordinary food culture." },
    ],
    localInsights: [
      "Kingston has genuinely good independent retail — the market retains real character.",
      "The commute to central London is 30-40 minutes — further than many residents expect.",
    ],
    transport: "National Rail to Waterloo (approximately 30 minutes). No underground.",
    bestFor: ["Families who value town character", "Cyclists and river lovers"],
    avoidIf: ["You need fast tube access", "You work east of the City"],
  },
  {
    slug: "hounslow",
    heroImage: "/boroughs/hounslow.jpg",
    name: "Hounslow",
    tagline: "The gateway borough — Heathrow connections, Thames-side Chiswick, and Brentford's renaissance",
    postcodes: ["TW3", "TW4", "TW5", "TW6", "TW7", "TW8", "W4"],
    description: "Hounslow's airport proximity is both a convenience and a reputation challenge. But Brentford's dramatic regeneration and Chiswick's extraordinary quality of life deserve wider recognition.",
    history: "Chiswick developed as a fashionable Thames-side retreat in the 18th century. The Great West Road became famous for its art deco Golden Mile factories in the 1930s.",
    landmarks: [
      { name: "Chiswick House", description: "A magnificent Palladian villa with one of England's finest 18th-century gardens." },
      { name: "Syon House", description: "The Duke of Northumberland's London residence — Robert Adam interiors." },
    ],
    hiddenGems: [
      { name: "Strand-on-the-Green", description: "A beautiful 18th-century riverside street in Chiswick — one of west London's finest hidden villages." },
    ],
    localInsights: [
      "Chiswick (W4) is extraordinarily desirable — excellent restaurants on Chiswick High Road.",
      "Noise from Heathrow flight paths is a genuine issue — check the flight path before buying.",
    ],
    transport: "District line through Gunnersbury, Kew Gardens, Richmond. National Rail from Brentford.",
    bestFor: ["Airport workers", "Families (Chiswick schools)", "Thames-side living seekers"],
    avoidIf: ["You are noise-sensitive (Heathrow flight paths)", "You need East London access"],
  },
  {
    slug: "waltham-forest",
    heroImage: "/boroughs/waltham-forest.jpg",
    name: "Waltham Forest",
    tagline: "Walthamstow Village, the Marshes, and east London's most exciting creative insurgency",
    postcodes: ["E4", "E10", "E11", "E17"],
    description: "Waltham Forest has undergone a remarkable transformation. Walthamstow Village is one of London's most desirable and affordable areas; the Marshes offer cycling and wildlife minutes from the Victoria line.",
    history: "William Morris was born in Walthamstow in 1834, and his childhood home is now one of London's finest small museums.",
    landmarks: [
      { name: "William Morris Gallery", description: "A world-class free museum celebrating one of Britain's greatest designers." },
      { name: "Walthamstow Village", description: "The best-preserved medieval village street in London." },
    ],
    hiddenGems: [
      { name: "The Walthamstow Wetlands", description: "Europe's largest urban wetland reserve — miraculous wildlife haven 20 minutes from Liverpool Street." },
    ],
    localInsights: [
      "The Victoria line from Walthamstow Central to Oxford Circus takes 20 minutes.",
      "Leyton and Leytonstone offer even better value on the Central line.",
    ],
    transport: "Good. Victoria line from Walthamstow Central. Central line from Leytonstone and Leyton.",
    bestFor: ["Families (outstanding value)", "Creative professionals", "Cyclists", "Nature lovers"],
    avoidIf: ["You want South or West London connections", "You prefer central Zone 1-2 living"],
  },
  {
    slug: "newham",
    heroImage: "/boroughs/newham.jpg",
    name: "Newham",
    tagline: "Olympic ambition, Westfield energy, and one of London's most exciting transformations",
    postcodes: ["E6", "E7", "E13", "E15", "E16"],
    description: "Newham was transformed by the 2012 Olympics. Stratford is now a genuine destination; Forest Gate offers some of east London's best Victorian housing.",
    history: "The 2012 Olympics required clearing contaminated industrial land — replacing it with parks, stadia, and new neighbourhoods.",
    landmarks: [
      { name: "Queen Elizabeth Olympic Park", description: "One of London's greatest post-industrial transformations — world-class sports facilities." },
    ],
    hiddenGems: [
      { name: "Forest Gate", description: "A rapidly improving Victorian neighbourhood with beautiful terraces and strong community feel." },
    ],
    localInsights: [
      "Stratford has exceptional transport — Jubilee, Central, Elizabeth lines, National Rail, and DLR intersect.",
      "Forest Gate E7 is one of east London's most undervalued areas.",
    ],
    transport: "Exceptional at Stratford. Jubilee, Central, Elizabeth lines, plus National Rail and DLR.",
    bestFor: ["Young professionals and first-time buyers", "Sports enthusiasts", "City workers"],
    avoidIf: ["You want an established neighbourhood feel", "You're sensitive to ongoing construction"],
  },
  {
    slug: "barnet",
    heroImage: "/boroughs/barnet.jpg",
    name: "Barnet",
    tagline: "North London's leafy suburban heartland with a surprising amount of character",
    postcodes: ["N2", "N3", "N12", "N20", "EN4", "EN5"],
    description: "Barnet is north London's most spacious and leafy borough — where the city gives way to something approaching countryside, with outstanding schools.",
    history: "Golders Green and Finchley developed rapidly after the Northern line extension, becoming home to the largest Jewish community outside Israel.",
    landmarks: [
      { name: "Hampstead Garden Suburb", description: "One of the world's finest examples of garden suburb planning." },
    ],
    hiddenGems: [
      { name: "Golders Hill Park", description: "The smaller, wilder half of Hampstead Heath — a free zoo and extraordinary views." },
    ],
    localInsights: [
      "Golders Green has one of London's finest concentrations of kosher restaurants and bakeries.",
      "East Finchley and North Finchley offer excellent value compared to Camden.",
      "Barnet has some of London's best state schools.",
    ],
    transport: "Good. Northern line through Golders Green, Finchley, and High Barnet.",
    bestFor: ["Families (outstanding schools)", "Orthodox and Jewish community", "Those seeking space and greenery"],
    avoidIf: ["You want urban energy", "You need fast access to East or South London"],
  },
  {
    slug: "haringey",
    heroImage: "/boroughs/haringey.jpg",
    name: "Haringey",
    tagline: "Wood Green's energy, Muswell Hill's elegance, and Tottenham's raw ambition",
    postcodes: ["N4", "N8", "N10", "N15", "N17", "N22"],
    description: "Haringey is a borough of remarkable contrasts: elegant Muswell Hill, Turkish and Kurdish Green Lanes, hipster Crouch End, and the football passion of Tottenham.",
    history: "Muswell Hill developed as a fashionable Edwardian suburb around Alexandra Palace.",
    landmarks: [
      { name: "Alexandra Palace", description: "Victorian people's palace with panoramic views of London and a famous ice rink." },
      { name: "Tottenham Hotspur Stadium", description: "One of the world's most architecturally stunning football stadiums." },
    ],
    hiddenGems: [
      { name: "Green Lanes", description: "London's finest stretch of authentic Turkish, Kurdish, and Greek restaurants — open late every night." },
    ],
    localInsights: [
      "Green Lanes between Manor House and Wood Green is extraordinary for food.",
      "Crouch End has no tube station — this keeps prices lower despite excellent quality of life.",
      "Tottenham N17 offers genuinely good value with the new stadium development.",
    ],
    transport: "Variable. Piccadilly line at Manor House, Victoria line at Seven Sisters, Overground at Crouch Hill.",
    bestFor: ["Turkish and Middle Eastern food lovers", "Football fans", "Value seekers in north London"],
    avoidIf: ["You need fast tube access everywhere", "You want Muswell Hill without a car"],
  },
  {
    slug: "enfield",
    heroImage: "/boroughs/enfield.jpg",
    name: "Enfield",
    tagline: "The edge of London — market town history, Lee Valley wilderness, and surprising countryside",
    postcodes: ["EN1", "EN2", "EN3", "N9", "N13", "N14", "N18", "N21"],
    description: "Enfield is where Greater London meets the countryside — a borough with historic market towns, vast Lee Valley parkland, and affordable family homes.",
    history: "Enfield Town received its market charter in 1303. The Royal Small Arms Factory produced the Lee-Enfield rifle used in both World Wars.",
    landmarks: [
      { name: "Forty Hall", description: "A beautifully restored Jacobean mansion in a working farm estate — free to visit the grounds." },
      { name: "Lee Valley Regional Park", description: "10,000 acres of wetland, rivers, and open space — cycling, kayaking, and wildlife." },
    ],
    hiddenGems: [
      { name: "Forty Hall Vineyard", description: "London's first commercial vineyard in centuries — tours and tastings available." },
    ],
    localInsights: [
      "Winchmore Hill and Palmers Green are Enfield's most desirable residential areas.",
      "Enfield offers the best value for families seeking detached houses.",
    ],
    transport: "Piccadilly line to Cockfosters, National Rail from Enfield Town.",
    bestFor: ["Families seeking space and value", "Nature lovers", "Liverpool Street commuters"],
    avoidIf: ["You want urban energy", "You need Zone 2 prices and transport"],
  },
  {
    slug: "sutton",
    heroImage: "/boroughs/sutton.jpg",
    name: "Sutton",
    tagline: "Surrey's London outpost — clean air, excellent schools, and genuine suburban character",
    postcodes: ["SM1", "SM2", "SM3", "SM5", "SM6"],
    description: "Sutton is south-west London's most reliably pleasant borough — clean, green, well-schooled, and home to some of Greater London's best-value family housing.",
    history: "The borough contains Carshalton Ponds — one of the most beautiful village settings in Greater London.",
    landmarks: [
      { name: "Carshalton Ponds", description: "A beautiful historic village green with ponds, a historic mill, and excellent architecture." },
    ],
    hiddenGems: [
      { name: "Beddington Park", description: "A historic landscape park with one of the few remaining dovecotes in Greater London." },
    ],
    localInsights: [
      "Sutton has consistently excellent state schools.",
      "Cheam and Belmont are the most desirable residential areas.",
    ],
    transport: "Thameslink to London Bridge. Northern line at Morden for south of the borough.",
    bestFor: ["Families prioritising schools and space", "Those seeking suburban quiet"],
    avoidIf: ["You want urban energy", "You rely on tube access"],
  },
  {
    slug: "redbridge",
    heroImage: "/boroughs/redbridge.jpg",
    name: "Redbridge",
    tagline: "Ilford's urban energy, Woodford's quiet woods, and a borough in confident transition",
    postcodes: ["IG1", "IG2", "IG3", "IG4", "IG5", "IG6", "E11", "E18"],
    description: "Redbridge offers family-friendly Victorian suburbs at affordable prices, with Elizabeth line access transforming connectivity.",
    history: "The area developed rapidly as a working-class suburb after the Victorian railway arrived.",
    landmarks: [
      { name: "Valentines Park", description: "A beautiful 18th-century parkland in Ilford with a lake and formal gardens." },
    ],
    hiddenGems: [
      { name: "Ilford Lane", description: "One of London's finest strips of South Asian restaurants." },
    ],
    localInsights: [
      "The Elizabeth line from Ilford to Liverpool Street takes under 10 minutes.",
      "Woodford and South Woodford are the most desirable residential areas.",
    ],
    transport: "Good. Elizabeth line from Ilford, Central line from Gants Hill and Woodford.",
    bestFor: ["Families seeking value", "City commuters via Elizabeth line"],
    avoidIf: ["You want central London energy", "You prefer south or west London"],
  },
  {
    slug: "barking-and-dagenham",
    heroImage: "/boroughs/barking-and-dagenham.jpg",
    name: "Barking & Dagenham",
    tagline: "East London's most affordable frontier — industrial heritage meets regeneration ambition",
    postcodes: ["IG11", "RM8", "RM9", "RM10"],
    description: "Barking and Dagenham is one of London's most affordable boroughs and one of its most ambitious regeneration stories.",
    history: "Barking Abbey was one of England's most powerful monastic institutions. The Ford Dagenham plant from 1931 once dominated the area.",
    landmarks: [
      { name: "Barking Abbey ruins", description: "The archaeological remains of one of medieval England's greatest abbeys — free to visit." },
      { name: "Eastbury Manor House", description: "An intact Elizabethan manor house in the middle of a modern housing estate." },
    ],
    hiddenGems: [
      { name: "Barking Park", description: "A large Victorian park with a boating lake, lido, and excellent facilities." },
    ],
    localInsights: [
      "The Elizabeth line from Barking reaches Liverpool Street in 8 minutes.",
      "This is one of London's most affordable boroughs for first-time buyers.",
    ],
    transport: "District, Hammersmith & City, and Elizabeth lines from Barking.",
    bestFor: ["First-time buyers", "Maximum value close to the City"],
    avoidIf: ["You prioritise prestige", "You want established cultural amenities"],
  },
  {
    slug: "havering",
    heroImage: "/boroughs/havering.jpg",
    name: "Havering",
    tagline: "Essex country houses, riverside marshes, and London's most genuine market town",
    postcodes: ["RM1", "RM2", "RM3", "RM11", "RM12"],
    description: "Havering is the most rural-feeling of Greater London's boroughs — touching genuine Essex countryside, with Upminster offering exceptional value for family buyers.",
    history: "Romford has been a market town since 1247. Much of Havering was farmland until the Victorian railway.",
    landmarks: [
      { name: "Romford Market", description: "One of the largest and most authentic traditional markets in Greater London." },
    ],
    hiddenGems: [
      { name: "Hornchurch Country Park", description: "Built on a former RAF base — surrounded by meadows and wetlands." },
    ],
    localInsights: [
      "Upminster is Havering's most desirable area — District line terminus and a genuine village feel.",
      "Havering offers London's best value for detached family houses with gardens.",
    ],
    transport: "District line to Upminster, Elizabeth line to Romford. Much of the borough requires a car.",
    bestFor: ["Families seeking large homes and gardens", "Those who prefer Essex edge-of-London living"],
    avoidIf: ["You rely on public transport", "You want urban energy or cultural amenities"],
  },
]

export function getBoroughByPostcode(postcode: string): BoroughGuide | null {
  // Match the postcode district anywhere in the input (handles full addresses, not just bare postcodes)
  const district = postcode.toUpperCase().match(/\b([A-Z]{1,2}[0-9][0-9A-Z]?)(?=\s*[0-9][A-Z]{2}\b|\s*,|\s*$)/)?.[1] || ""
  if (!district) return null
  // Match by EXACT postcode district equality. The previous "startsWith" approach
  // incorrectly mapped NW11→Camden (because "NW11".startsWith("NW1")) and similar
  // bugs. Postcode districts are atomic identifiers; we treat them that way.
  //
  // Sub-district codes like "EC1V" still match EC1V exactly in Islington's list.
  // If a borough listed "EC1" only, and we see "EC1V", we accept it as a partial
  // fall-through only when no exact match exists anywhere — kept simple here as a
  // second pass to preserve EC1 → EC1V / EC1A / etc behaviour.
  for (const b of boroughGuides) {
    if (b.postcodes.includes(district)) return b
  }
  // Fallback: prefix-match BUT only against same letter-portion + digit-portion,
  // strictly bounded so "NW11" never matches "NW1" but "EC1V" can match "EC1".
  for (const b of boroughGuides) {
    for (const pc of b.postcodes) {
      // Allow EC1V→EC1 only if pc has no trailing digit beyond what district has
      // — i.e. district starts with pc AND the next char in district is a letter (sub-district code, not a digit).
      if (district.startsWith(pc) && district.length > pc.length) {
        const nextChar = district[pc.length]
        if (/[A-Z]/.test(nextChar)) return b
      }
    }
  }
  return null
}


export function getBoroughByName(name: string | null | undefined): BoroughGuide | null {
  if (!name) return null
  const normalised = name.trim().toLowerCase()
  return boroughGuides.find(b => b.name.toLowerCase() === normalised || b.slug.toLowerCase() === normalised) || null
}
export function getBoroughBySlug(slug: string): BoroughGuide | null {
  return boroughGuides.find(b => b.slug === slug) || null
}
