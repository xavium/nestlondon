'use client'

import { useEffect, useRef } from 'react'
import { getViewedListings, markAsViewed } from '@/lib/viewed'

const LINE_COLOURS: Record<string, string> = {
  'Bakerloo': '#B36305', 'Central': '#E32017', 'Circle': '#FFD300',
  'District': '#00782A', 'Hammersmith & City': '#F3A9BB', 'Jubilee': '#A0A5A9',
  'Metropolitan': '#9B0056', 'Northern': '#000000', 'Piccadilly': '#003688',
  'Victoria': '#0098D4', 'Waterloo & City': '#95CDBA', 'DLR': '#00A4A7',
  'Overground': '#EE7C0E', 'Elizabeth': '#6950A1', 'Tram': '#84B817',
}

const TUBE_STATIONS = [
  { name: 'Acton Central', lat: 51.5088, lng: -0.2634, lines: ['Overground'] },
  { name: 'Acton Main Line', lat: 51.5170, lng: -0.2674, lines: ['Elizabeth'] },
  { name: 'Acton Town', lat: 51.5028, lng: -0.2801, lines: ['District','Piccadilly'] },
  { name: 'Aldgate', lat: 51.5143, lng: -0.0755, lines: ['Circle','Metropolitan'] },
  { name: 'Aldgate East', lat: 51.5152, lng: -0.0726, lines: ['District','Hammersmith & City'] },
  { name: 'All Saints', lat: 51.5107, lng: -0.0132, lines: ['DLR'] },
  { name: 'Alperton', lat: 51.5413, lng: -0.2996, lines: ['Piccadilly'] },
  { name: 'Amersham', lat: 51.6740, lng: -0.6072, lines: ['Metropolitan'] },
  { name: 'Angel', lat: 51.5323, lng: -0.1057, lines: ['Northern'] },
  { name: 'Archway', lat: 51.5653, lng: -0.1353, lines: ['Northern'] },
  { name: 'Arnos Grove', lat: 51.6163, lng: -0.1329, lines: ['Piccadilly'] },
  { name: 'Arsenal', lat: 51.5586, lng: -0.1059, lines: ['Piccadilly'] },
  { name: 'Baker Street', lat: 51.5226, lng: -0.1571, lines: ['Bakerloo','Circle','Hammersmith & City','Jubilee','Metropolitan'] },
  { name: 'Balham', lat: 51.4431, lng: -0.1527, lines: ['Northern'] },
  { name: 'Bank', lat: 51.5133, lng: -0.0886, lines: ['Central','Northern','Waterloo & City','DLR'] },
  { name: 'Barbican', lat: 51.5203, lng: -0.0979, lines: ['Circle','Hammersmith & City','Metropolitan'] },
  { name: 'Barking', lat: 51.5397, lng: 0.0812, lines: ['District','Hammersmith & City','Overground'] },
  { name: 'Barkingside', lat: 51.5794, lng: 0.0904, lines: ['Central'] },
  { name: 'Barons Court', lat: 51.4905, lng: -0.2139, lines: ['District','Piccadilly'] },
  { name: 'Battersea Power Station', lat: 51.4833, lng: -0.1441, lines: ['Northern'] },
  { name: 'Bayswater', lat: 51.5121, lng: -0.1879, lines: ['Circle','District'] },
  { name: 'Beckton', lat: 51.5148, lng: 0.0611, lines: ['DLR'] },
  { name: 'Beckton Park', lat: 51.5085, lng: 0.0499, lines: ['DLR'] },
  { name: 'Belsize Park', lat: 51.5503, lng: -0.1643, lines: ['Northern'] },
  { name: 'Bermondsey', lat: 51.4982, lng: -0.0640, lines: ['Jubilee'] },
  { name: 'Bethnal Green', lat: 51.5277, lng: -0.0549, lines: ['Central'] },
  { name: 'Blackfriars', lat: 51.5119, lng: -0.1038, lines: ['Circle','District'] },
  { name: 'Blackhorse Road', lat: 51.5867, lng: -0.0414, lines: ['Victoria','Overground'] },
  { name: 'Blackwall', lat: 51.5076, lng: -0.0119, lines: ['DLR'] },
  { name: 'Bond Street', lat: 51.5142, lng: -0.1494, lines: ['Central','Jubilee','Elizabeth'] },
  { name: 'Borough', lat: 51.5014, lng: -0.0941, lines: ['Northern'] },
  { name: 'Boston Manor', lat: 51.5006, lng: -0.3238, lines: ['Piccadilly'] },
  { name: 'Bounds Green', lat: 51.6022, lng: -0.1219, lines: ['Piccadilly'] },
  { name: 'Bow Church', lat: 51.5271, lng: -0.0209, lines: ['DLR'] },
  { name: 'Bow Road', lat: 51.5270, lng: -0.0247, lines: ['District','Hammersmith & City'] },
  { name: 'Brent Cross', lat: 51.5766, lng: -0.2133, lines: ['Northern'] },
  { name: 'Brixton', lat: 51.4627, lng: -0.1145, lines: ['Victoria'] },
  { name: 'Bromley-by-Bow', lat: 51.5225, lng: -0.0115, lines: ['District','Hammersmith & City'] },
  { name: 'Brondesbury', lat: 51.5463, lng: -0.2020, lines: ['Overground'] },
  { name: 'Brondesbury Park', lat: 51.5408, lng: -0.2102, lines: ['Overground'] },
  { name: 'Buckhurst Hill', lat: 51.6268, lng: 0.0467, lines: ['Central'] },
  { name: 'Burnt Oak', lat: 51.6024, lng: -0.2650, lines: ['Northern'] },
  { name: 'Caledonian Road', lat: 51.5430, lng: -0.1197, lines: ['Piccadilly'] },
  { name: 'Caledonian Road & Barnsbury', lat: 51.5476, lng: -0.1150, lines: ['Overground'] },
  { name: 'Camden Road', lat: 51.5420, lng: -0.1393, lines: ['Overground'] },
  { name: 'Camden Town', lat: 51.5392, lng: -0.1426, lines: ['Northern'] },
  { name: 'Canada Water', lat: 51.4982, lng: -0.0502, lines: ['Jubilee','Overground'] },
  { name: 'Canary Wharf', lat: 51.5051, lng: -0.0209, lines: ['Jubilee','DLR','Elizabeth'] },
  { name: 'Cannon Street', lat: 51.5113, lng: -0.0904, lines: ['Circle','District'] },
  { name: 'Canons Park', lat: 51.6080, lng: -0.2948, lines: ['Jubilee'] },
  { name: 'Chalk Farm', lat: 51.5444, lng: -0.1537, lines: ['Northern'] },
  { name: 'Chancery Lane', lat: 51.5143, lng: -0.1114, lines: ['Central'] },
  { name: 'Charing Cross', lat: 51.5081, lng: -0.1248, lines: ['Bakerloo','Northern'] },
  { name: 'Chesham', lat: 51.7054, lng: -0.6146, lines: ['Metropolitan'] },
  { name: 'Chigwell', lat: 51.6243, lng: 0.0748, lines: ['Central'] },
  { name: 'Chiswick Park', lat: 51.4942, lng: -0.2685, lines: ['District'] },
  { name: 'Chorleywood', lat: 51.6543, lng: -0.5197, lines: ['Metropolitan'] },
  { name: 'Clapham Common', lat: 51.4618, lng: -0.1386, lines: ['Northern'] },
  { name: 'Clapham North', lat: 51.4647, lng: -0.1300, lines: ['Northern'] },
  { name: 'Clapham South', lat: 51.4558, lng: -0.1479, lines: ['Northern'] },
  { name: 'Clapton', lat: 51.5589, lng: -0.0575, lines: ['Overground'] },
  { name: 'Cockfosters', lat: 51.6519, lng: -0.1498, lines: ['Piccadilly'] },
  { name: 'Colindale', lat: 51.5953, lng: -0.2501, lines: ['Northern'] },
  { name: 'Colliers Wood', lat: 51.4144, lng: -0.1876, lines: ['Northern'] },
  { name: 'Covent Garden', lat: 51.5129, lng: -0.1243, lines: ['Piccadilly'] },
  { name: 'Cricklewood', lat: 51.5593, lng: -0.2121, lines: ['Overground'] },
  { name: 'Crossharbour', lat: 51.4942, lng: -0.0148, lines: ['DLR'] },
  { name: 'Croxley', lat: 51.6480, lng: -0.4422, lines: ['Metropolitan'] },
  { name: 'Custom House', lat: 51.5093, lng: 0.0274, lines: ['DLR','Elizabeth'] },
  { name: 'Cutty Sark', lat: 51.4831, lng: -0.0098, lines: ['DLR'] },
  { name: 'Cyprus', lat: 51.5080, lng: 0.0432, lines: ['DLR'] },
  { name: 'Dagenham East', lat: 51.5440, lng: 0.1284, lines: ['District'] },
  { name: 'Dagenham Heathway', lat: 51.5410, lng: 0.1118, lines: ['District'] },
  { name: 'Dalston Junction', lat: 51.5461, lng: -0.0756, lines: ['Overground'] },
  { name: 'Dalston Kingsland', lat: 51.5490, lng: -0.0757, lines: ['Overground'] },
  { name: 'Debden', lat: 51.6451, lng: 0.0829, lines: ['Central'] },
  { name: 'Dollis Hill', lat: 51.5520, lng: -0.2346, lines: ['Jubilee'] },
  { name: 'Ealing Broadway', lat: 51.5148, lng: -0.3016, lines: ['Central','District','Elizabeth'] },
  { name: 'Ealing Common', lat: 51.5100, lng: -0.2882, lines: ['District','Piccadilly'] },
  { name: 'Earls Court', lat: 51.4914, lng: -0.1937, lines: ['District','Piccadilly'] },
  { name: 'East Acton', lat: 51.5169, lng: -0.2492, lines: ['Central'] },
  { name: 'East Finchley', lat: 51.5872, lng: -0.1649, lines: ['Northern'] },
  { name: 'East Ham', lat: 51.5399, lng: 0.0509, lines: ['District','Hammersmith & City'] },
  { name: 'East India', lat: 51.5085, lng: -0.0020, lines: ['DLR'] },
  { name: 'East Putney', lat: 51.4596, lng: -0.2122, lines: ['District'] },
  { name: 'Edgware', lat: 51.6133, lng: -0.2751, lines: ['Northern'] },
  { name: 'Edgware Road', lat: 51.5199, lng: -0.1699, lines: ['Bakerloo'] },
  { name: 'Edmonton Green', lat: 51.6221, lng: -0.0601, lines: ['Overground'] },
  { name: 'Elephant and Castle', lat: 51.4943, lng: -0.1003, lines: ['Bakerloo','Northern'] },
  { name: 'Elm Park', lat: 51.5490, lng: 0.1980, lines: ['District'] },
  { name: 'Embankment', lat: 51.5074, lng: -0.1223, lines: ['Bakerloo','Circle','District','Northern'] },
  { name: 'Emerson Park', lat: 51.5748, lng: 0.2143, lines: ['Overground'] },
  { name: 'Empire Wharf', lat: 51.4899, lng: -0.0266, lines: ['DLR'] },
  { name: 'Euston', lat: 51.5282, lng: -0.1337, lines: ['Northern','Victoria'] },
  { name: 'Euston Square', lat: 51.5263, lng: -0.1353, lines: ['Circle','Hammersmith & City','Metropolitan'] },
  { name: 'Fairlop', lat: 51.5956, lng: 0.0917, lines: ['Central'] },
  { name: 'Farringdon', lat: 51.5203, lng: -0.1050, lines: ['Circle','Hammersmith & City','Metropolitan','Elizabeth'] },
  { name: 'Finchley Central', lat: 51.5999, lng: -0.1926, lines: ['Northern'] },
  { name: 'Finchley Road', lat: 51.5468, lng: -0.1787, lines: ['Jubilee','Metropolitan'] },
  { name: 'Finsbury Park', lat: 51.5642, lng: -0.1065, lines: ['Piccadilly','Victoria'] },
  { name: 'Forest Gate', lat: 51.5506, lng: 0.0344, lines: ['Elizabeth'] },
  { name: 'Fulham Broadway', lat: 51.4803, lng: -0.1950, lines: ['District'] },
  { name: 'Gants Hill', lat: 51.5762, lng: 0.0683, lines: ['Central'] },
  { name: 'Gloucester Road', lat: 51.4944, lng: -0.1829, lines: ['Circle','District','Piccadilly'] },
  { name: 'Golders Green', lat: 51.5723, lng: -0.1942, lines: ['Northern'] },
  { name: 'Goldhawk Road', lat: 51.5063, lng: -0.2267, lines: ['Hammersmith & City'] },
  { name: 'Goodge Street', lat: 51.5199, lng: -0.1350, lines: ['Northern'] },
  { name: 'Gospel Oak', lat: 51.5547, lng: -0.1493, lines: ['Overground'] },
  { name: 'Grange Hill', lat: 51.6021, lng: 0.0918, lines: ['Central'] },
  { name: 'Greenford', lat: 51.5423, lng: -0.3464, lines: ['Central'] },
  { name: 'Green Park', lat: 51.5067, lng: -0.1428, lines: ['Jubilee','Piccadilly','Victoria'] },
  { name: 'Greenwich', lat: 51.4781, lng: -0.0147, lines: ['DLR','Elizabeth'] },
  { name: 'Gunnersbury', lat: 51.4908, lng: -0.2750, lines: ['District','Overground'] },
  { name: 'Hackney Central', lat: 51.5468, lng: -0.0554, lines: ['Overground'] },
  { name: 'Hackney Wick', lat: 51.5432, lng: -0.0215, lines: ['Overground'] },
  { name: 'Hainault', lat: 51.6027, lng: 0.0939, lines: ['Central'] },
  { name: 'Hammersmith', lat: 51.4934, lng: -0.2239, lines: ['Circle','District','Hammersmith & City','Piccadilly'] },
  { name: 'Hampstead', lat: 51.5565, lng: -0.1780, lines: ['Northern'] },
  { name: 'Hampstead Heath', lat: 51.5559, lng: -0.1649, lines: ['Overground'] },
  { name: 'Hanger Lane', lat: 51.5300, lng: -0.2999, lines: ['Central'] },
  { name: 'Harlesden', lat: 51.5359, lng: -0.2575, lines: ['Bakerloo','Overground'] },
  { name: 'Harrow and Wealdstone', lat: 51.5924, lng: -0.3351, lines: ['Bakerloo','Overground'] },
  { name: 'Harrow on the Hill', lat: 51.5793, lng: -0.3353, lines: ['Metropolitan'] },
  { name: 'Hatch End', lat: 51.6120, lng: -0.3699, lines: ['Overground'] },
  { name: 'Hatton Cross', lat: 51.4664, lng: -0.4237, lines: ['Piccadilly'] },
  { name: 'Heathrow Terminal 1,2,3', lat: 51.4713, lng: -0.4524, lines: ['Piccadilly','Elizabeth'] },
  { name: 'Heathrow Terminal 4', lat: 51.4585, lng: -0.4463, lines: ['Piccadilly','Elizabeth'] },
  { name: 'Heathrow Terminal 5', lat: 51.4732, lng: -0.4889, lines: ['Piccadilly','Elizabeth'] },
  { name: 'Hendon Central', lat: 51.5833, lng: -0.2268, lines: ['Northern'] },
  { name: 'Heron Quays', lat: 51.5033, lng: -0.0196, lines: ['DLR'] },
  { name: 'High Barnet', lat: 51.6501, lng: -0.1941, lines: ['Northern'] },
  { name: 'High Street Kensington', lat: 51.5010, lng: -0.1921, lines: ['Circle','District'] },
  { name: 'Highbury and Islington', lat: 51.5460, lng: -0.1039, lines: ['Victoria','Overground'] },
  { name: 'Highgate', lat: 51.5778, lng: -0.1459, lines: ['Northern'] },
  { name: 'Hillingdon', lat: 51.5556, lng: -0.4483, lines: ['Metropolitan','Piccadilly'] },
  { name: 'Holborn', lat: 51.5174, lng: -0.1200, lines: ['Central','Piccadilly'] },
  { name: 'Holland Park', lat: 51.5073, lng: -0.2063, lines: ['Central'] },
  { name: 'Holloway Road', lat: 51.5527, lng: -0.1133, lines: ['Piccadilly'] },
  { name: 'Homerton', lat: 51.5468, lng: -0.0430, lines: ['Overground'] },
  { name: 'Honor Oak Park', lat: 51.4449, lng: -0.0533, lines: ['Overground'] },
  { name: 'Hornchurch', lat: 51.5542, lng: 0.2133, lines: ['District'] },
  { name: 'Hounslow Central', lat: 51.4726, lng: -0.3630, lines: ['Piccadilly'] },
  { name: 'Hounslow East', lat: 51.4740, lng: -0.3521, lines: ['Piccadilly'] },
  { name: 'Hounslow West', lat: 51.4737, lng: -0.3863, lines: ['Piccadilly'] },
  { name: 'Hyde Park Corner', lat: 51.5027, lng: -0.1527, lines: ['Piccadilly'] },
  { name: 'Ickenham', lat: 51.5611, lng: -0.4425, lines: ['Metropolitan','Piccadilly'] },
  { name: 'Island Gardens', lat: 51.4883, lng: -0.0079, lines: ['DLR'] },
  { name: 'Kennington', lat: 51.4884, lng: -0.1050, lines: ['Northern'] },
  { name: 'Kensal Green', lat: 51.5305, lng: -0.2257, lines: ['Bakerloo','Overground'] },
  { name: 'Kensal Rise', lat: 51.5349, lng: -0.2200, lines: ['Overground'] },
  { name: 'Kensington Olympia', lat: 51.4985, lng: -0.2103, lines: ['District','Overground'] },
  { name: 'Kentish Town', lat: 51.5503, lng: -0.1408, lines: ['Northern'] },
  { name: 'Kentish Town West', lat: 51.5497, lng: -0.1490, lines: ['Overground'] },
  { name: 'Kenton', lat: 51.5819, lng: -0.3168, lines: ['Bakerloo','Overground'] },
  { name: 'Kew Gardens', lat: 51.4677, lng: -0.2851, lines: ['District','Overground'] },
  { name: 'Kilburn', lat: 51.5466, lng: -0.2041, lines: ['Jubilee'] },
  { name: 'Kilburn High Road', lat: 51.5487, lng: -0.1922, lines: ['Overground'] },
  { name: 'Kilburn Park', lat: 51.5353, lng: -0.1939, lines: ['Bakerloo'] },
  { name: 'Kings Cross St Pancras', lat: 51.5308, lng: -0.1238, lines: ['Circle','Hammersmith & City','Metropolitan','Northern','Piccadilly','Victoria','Elizabeth'] },
  { name: 'Kingsbury', lat: 51.5844, lng: -0.2786, lines: ['Jubilee'] },
  { name: 'Knightsbridge', lat: 51.5014, lng: -0.1607, lines: ['Piccadilly'] },
  { name: 'Ladbroke Grove', lat: 51.5170, lng: -0.2101, lines: ['Hammersmith & City'] },
  { name: 'Lambeth North', lat: 51.4986, lng: -0.1116, lines: ['Bakerloo'] },
  { name: 'Lancaster Gate', lat: 51.5119, lng: -0.1756, lines: ['Central'] },
  { name: 'Latimer Road', lat: 51.5134, lng: -0.2178, lines: ['Hammersmith & City'] },
  { name: 'Leicester Square', lat: 51.5113, lng: -0.1281, lines: ['Northern','Piccadilly'] },
  { name: 'Leyton', lat: 51.5563, lng: -0.0059, lines: ['Central'] },
  { name: 'Leytonstone', lat: 51.5688, lng: 0.0088, lines: ['Central'] },
  { name: 'Limehouse', lat: 51.5121, lng: -0.0397, lines: ['DLR'] },
  { name: 'Liverpool Street', lat: 51.5178, lng: -0.0823, lines: ['Central','Circle','Hammersmith & City','Metropolitan','Elizabeth'] },
  { name: 'London Bridge', lat: 51.5055, lng: -0.0861, lines: ['Jubilee','Northern'] },
  { name: 'London Fields', lat: 51.5415, lng: -0.0594, lines: ['Overground'] },
  { name: 'Loughton', lat: 51.6416, lng: 0.0554, lines: ['Central'] },
  { name: 'Maida Vale', lat: 51.5295, lng: -0.1858, lines: ['Bakerloo'] },
  { name: 'Manor House', lat: 51.5704, lng: -0.0985, lines: ['Piccadilly'] },
  { name: 'Mansion House', lat: 51.5122, lng: -0.0942, lines: ['Circle','District'] },
  { name: 'Marble Arch', lat: 51.5137, lng: -0.1585, lines: ['Central'] },
  { name: 'Maryland', lat: 51.5461, lng: 0.0148, lines: ['Elizabeth'] },
  { name: 'Marylebone', lat: 51.5224, lng: -0.1631, lines: ['Bakerloo'] },
  { name: 'Mile End', lat: 51.5253, lng: -0.0332, lines: ['Central','District','Hammersmith & City'] },
  { name: 'Mill Hill East', lat: 51.6087, lng: -0.2026, lines: ['Northern'] },
  { name: 'Monument', lat: 51.5103, lng: -0.0863, lines: ['Circle','District'] },
  { name: 'Moorgate', lat: 51.5185, lng: -0.0886, lines: ['Circle','Hammersmith & City','Metropolitan','Northern'] },
  { name: 'Morden', lat: 51.4025, lng: -0.1948, lines: ['Northern'] },
  { name: 'Mornington Crescent', lat: 51.5342, lng: -0.1388, lines: ['Northern'] },
  { name: 'Mudchute', lat: 51.4933, lng: -0.0147, lines: ['DLR'] },
  { name: 'Neasden', lat: 51.5544, lng: -0.2504, lines: ['Jubilee'] },
  { name: 'New Cross', lat: 51.4764, lng: -0.0326, lines: ['Overground'] },
  { name: 'New Cross Gate', lat: 51.4757, lng: -0.0403, lines: ['Overground'] },
  { name: 'Nine Elms', lat: 51.4843, lng: -0.1283, lines: ['Northern'] },
  { name: 'North Acton', lat: 51.5229, lng: -0.2595, lines: ['Central'] },
  { name: 'North Ealing', lat: 51.5181, lng: -0.2895, lines: ['Piccadilly'] },
  { name: 'North Greenwich', lat: 51.5006, lng: 0.0040, lines: ['Jubilee'] },
  { name: 'North Harrow', lat: 51.5890, lng: -0.3520, lines: ['Metropolitan'] },
  { name: 'North Wembley', lat: 51.5625, lng: -0.3038, lines: ['Bakerloo'] },
  { name: 'Northfields', lat: 51.4994, lng: -0.3086, lines: ['Piccadilly'] },
  { name: 'Northolt', lat: 51.5484, lng: -0.3683, lines: ['Central'] },
  { name: 'Northwick Park', lat: 51.5789, lng: -0.3228, lines: ['Metropolitan'] },
  { name: 'Northwood', lat: 51.6103, lng: -0.4231, lines: ['Metropolitan'] },
  { name: 'Northwood Hills', lat: 51.6013, lng: -0.4064, lines: ['Metropolitan'] },
  { name: 'Notting Hill Gate', lat: 51.5094, lng: -0.1967, lines: ['Central','Circle','District'] },
  { name: 'Oakwood', lat: 51.6367, lng: -0.1329, lines: ['Piccadilly'] },
  { name: 'Old Street', lat: 51.5263, lng: -0.0875, lines: ['Northern'] },
  { name: 'Osterley', lat: 51.4806, lng: -0.3526, lines: ['Piccadilly'] },
  { name: 'Oval', lat: 51.4815, lng: -0.1134, lines: ['Northern'] },
  { name: 'Oxford Circus', lat: 51.5152, lng: -0.1415, lines: ['Bakerloo','Central','Victoria'] },
  { name: 'Paddington', lat: 51.5154, lng: -0.1755, lines: ['Bakerloo','Circle','District','Hammersmith & City','Elizabeth'] },
  { name: 'Park Royal', lat: 51.5274, lng: -0.2884, lines: ['Piccadilly'] },
  { name: 'Parsons Green', lat: 51.4753, lng: -0.2010, lines: ['District'] },
  { name: 'Peckham Rye', lat: 51.4697, lng: -0.0694, lines: ['Overground'] },
  { name: 'Perivale', lat: 51.5361, lng: -0.3224, lines: ['Central'] },
  { name: 'Pimlico', lat: 51.4893, lng: -0.1334, lines: ['Victoria'] },
  { name: 'Pinner', lat: 51.5931, lng: -0.3802, lines: ['Metropolitan'] },
  { name: 'Plaistow', lat: 51.5313, lng: 0.0196, lines: ['District','Hammersmith & City'] },
  { name: 'Poplar', lat: 51.5073, lng: -0.0175, lines: ['DLR'] },
  { name: 'Preston Road', lat: 51.5722, lng: -0.2951, lines: ['Metropolitan'] },
  { name: 'Prince Regent', lat: 51.5097, lng: 0.0344, lines: ['DLR'] },
  { name: 'Pudding Mill Lane', lat: 51.5316, lng: -0.0043, lines: ['DLR'] },
  { name: 'Putney Bridge', lat: 51.4676, lng: -0.2100, lines: ['District'] },
  { name: 'Queens Park', lat: 51.5344, lng: -0.2044, lines: ['Bakerloo','Overground'] },
  { name: 'Queensbury', lat: 51.5940, lng: -0.2863, lines: ['Jubilee'] },
  { name: 'Queensway', lat: 51.5107, lng: -0.1874, lines: ['Central'] },
  { name: 'Ravenscourt Park', lat: 51.4941, lng: -0.2359, lines: ['District'] },
  { name: 'Rayners Lane', lat: 51.5752, lng: -0.3714, lines: ['Metropolitan','Piccadilly'] },
  { name: 'Rectory Road', lat: 51.5589, lng: -0.0649, lines: ['Overground'] },
  { name: 'Redbridge', lat: 51.5762, lng: 0.0448, lines: ['Central'] },
  { name: 'Regents Park', lat: 51.5234, lng: -0.1466, lines: ['Bakerloo'] },
  { name: 'Richmond', lat: 51.4633, lng: -0.3012, lines: ['District','Overground'] },
  { name: 'Rickmansworth', lat: 51.6415, lng: -0.4706, lines: ['Metropolitan'] },
  { name: 'Rotherhithe', lat: 51.5007, lng: -0.0526, lines: ['Overground'] },
  { name: 'Royal Albert', lat: 51.5091, lng: 0.0408, lines: ['DLR'] },
  { name: 'Royal Oak', lat: 51.5196, lng: -0.1881, lines: ['Hammersmith & City'] },
  { name: 'Royal Victoria', lat: 51.5090, lng: 0.0198, lines: ['DLR'] },
  { name: 'Ruislip', lat: 51.5713, lng: -0.4277, lines: ['Central','Metropolitan'] },
  { name: 'Ruislip Gardens', lat: 51.5617, lng: -0.4127, lines: ['Central'] },
  { name: 'Ruislip Manor', lat: 51.5737, lng: -0.4171, lines: ['Metropolitan','Piccadilly'] },
  { name: 'Russell Square', lat: 51.5234, lng: -0.1240, lines: ['Piccadilly'] },
  { name: 'Seven Sisters', lat: 51.5823, lng: -0.0749, lines: ['Victoria','Overground'] },
  { name: 'Shadwell', lat: 51.5118, lng: -0.0570, lines: ['DLR','Overground'] },
  { name: 'Shepherds Bush', lat: 51.5050, lng: -0.2183, lines: ['Central'] },
  { name: 'Shepherds Bush Market', lat: 51.5058, lng: -0.2259, lines: ['Hammersmith & City'] },
  { name: 'Shoreditch High Street', lat: 51.5228, lng: -0.0755, lines: ['Overground'] },
  { name: 'Sloane Square', lat: 51.4924, lng: -0.1565, lines: ['Circle','District'] },
  { name: 'Snaresbrook', lat: 51.5808, lng: 0.0196, lines: ['Central'] },
  { name: 'South Ealing', lat: 51.5012, lng: -0.3078, lines: ['Piccadilly'] },
  { name: 'South Hampstead', lat: 51.5424, lng: -0.1769, lines: ['Overground'] },
  { name: 'South Harrow', lat: 51.5630, lng: -0.3521, lines: ['Piccadilly'] },
  { name: 'South Kensington', lat: 51.4941, lng: -0.1738, lines: ['Circle','District','Piccadilly'] },
  { name: 'South Ruislip', lat: 51.5565, lng: -0.3987, lines: ['Central'] },
  { name: 'South Wimbledon', lat: 51.4145, lng: -0.1916, lines: ['Northern'] },
  { name: 'South Woodford', lat: 51.5922, lng: 0.0277, lines: ['Central'] },
  { name: 'Southfields', lat: 51.4445, lng: -0.2068, lines: ['District'] },
  { name: 'Southgate', lat: 51.6321, lng: -0.1279, lines: ['Piccadilly'] },
  { name: 'Southwark', lat: 51.5044, lng: -0.1052, lines: ['Jubilee'] },
  { name: 'St James Park', lat: 51.4994, lng: -0.1335, lines: ['Circle','District'] },
  { name: 'St Johns Wood', lat: 51.5348, lng: -0.1737, lines: ['Jubilee'] },
  { name: 'St Pauls', lat: 51.5146, lng: -0.0973, lines: ['Central'] },
  { name: 'Stamford Brook', lat: 51.4946, lng: -0.2432, lines: ['District'] },
  { name: 'Stanmore', lat: 51.6194, lng: -0.3028, lines: ['Jubilee'] },
  { name: 'Stepney Green', lat: 51.5219, lng: -0.0461, lines: ['District','Hammersmith & City'] },
  { name: 'Stockwell', lat: 51.4723, lng: -0.1228, lines: ['Northern','Victoria'] },
  { name: 'Stoke Newington', lat: 51.5635, lng: -0.0740, lines: ['Overground'] },
  { name: 'Stonebridge Park', lat: 51.5444, lng: -0.2761, lines: ['Bakerloo','Overground'] },
  { name: 'Stratford', lat: 51.5415, lng: -0.0042, lines: ['Central','DLR','Jubilee','Overground','Elizabeth'] },
  { name: 'Streatham', lat: 51.4268, lng: -0.1323, lines: ['Overground'] },
  { name: 'Sudbury Hill', lat: 51.5567, lng: -0.3359, lines: ['Piccadilly'] },
  { name: 'Sudbury Town', lat: 51.5493, lng: -0.3149, lines: ['Piccadilly'] },
  { name: 'Surrey Quays', lat: 51.4937, lng: -0.0498, lines: ['Overground'] },
  { name: 'Swiss Cottage', lat: 51.5432, lng: -0.1738, lines: ['Jubilee'] },
  { name: 'Temple', lat: 51.5113, lng: -0.1141, lines: ['Circle','District'] },
  { name: 'Theydon Bois', lat: 51.6717, lng: 0.1030, lines: ['Central'] },
  { name: 'Tooting Bec', lat: 51.4362, lng: -0.1598, lines: ['Northern'] },
  { name: 'Tooting Broadway', lat: 51.4277, lng: -0.1680, lines: ['Northern'] },
  { name: 'Tottenham Court Road', lat: 51.5165, lng: -0.1306, lines: ['Central','Northern','Elizabeth'] },
  { name: 'Tottenham Hale', lat: 51.5882, lng: -0.0594, lines: ['Victoria','Overground'] },
  { name: 'Tower Gateway', lat: 51.5099, lng: -0.0740, lines: ['DLR'] },
  { name: 'Tower Hill', lat: 51.5098, lng: -0.0766, lines: ['Circle','District'] },
  { name: 'Tufnell Park', lat: 51.5569, lng: -0.1376, lines: ['Northern'] },
  { name: 'Turnham Green', lat: 51.4951, lng: -0.2548, lines: ['District','Piccadilly'] },
  { name: 'Turnpike Lane', lat: 51.5904, lng: -0.1025, lines: ['Piccadilly'] },
  { name: 'Upminster', lat: 51.5590, lng: 0.2513, lines: ['District'] },
  { name: 'Upminster Bridge', lat: 51.5578, lng: 0.2337, lines: ['District'] },
  { name: 'Upney', lat: 51.5380, lng: 0.1000, lines: ['District'] },
  { name: 'Upton Park', lat: 51.5352, lng: 0.0342, lines: ['District','Hammersmith & City'] },
  { name: 'Uxbridge', lat: 51.5462, lng: -0.4783, lines: ['Metropolitan','Piccadilly'] },
  { name: 'Vauxhall', lat: 51.4861, lng: -0.1253, lines: ['Victoria'] },
  { name: 'Victoria', lat: 51.4965, lng: -0.1441, lines: ['Circle','District','Victoria'] },
  { name: 'Walthamstow Central', lat: 51.5830, lng: -0.0197, lines: ['Victoria','Overground'] },
  { name: 'Wanstead', lat: 51.5786, lng: 0.0280, lines: ['Central'] },
  { name: 'Warren Street', lat: 51.5245, lng: -0.1386, lines: ['Northern','Victoria'] },
  { name: 'Warwick Avenue', lat: 51.5233, lng: -0.1836, lines: ['Bakerloo'] },
  { name: 'Waterloo', lat: 51.5036, lng: -0.1143, lines: ['Bakerloo','Jubilee','Northern','Waterloo & City'] },
  { name: 'Watford', lat: 51.6572, lng: -0.4170, lines: ['Metropolitan'] },
  { name: 'Wembley Central', lat: 51.5524, lng: -0.2963, lines: ['Bakerloo','Overground'] },
  { name: 'Wembley Park', lat: 51.5635, lng: -0.2795, lines: ['Jubilee','Metropolitan'] },
  { name: 'West Acton', lat: 51.5174, lng: -0.2806, lines: ['Central'] },
  { name: 'West Brompton', lat: 51.4872, lng: -0.1947, lines: ['District','Overground'] },
  { name: 'West Finchley', lat: 51.6090, lng: -0.1883, lines: ['Northern'] },
  { name: 'West Ham', lat: 51.5288, lng: 0.0050, lines: ['District','Hammersmith & City','Jubilee'] },
  { name: 'West Hampstead', lat: 51.5472, lng: -0.1913, lines: ['Jubilee','Overground'] },
  { name: 'West Harrow', lat: 51.5795, lng: -0.3527, lines: ['Metropolitan'] },
  { name: 'West India Quay', lat: 51.5060, lng: -0.0203, lines: ['DLR'] },
  { name: 'West Kensington', lat: 51.4900, lng: -0.2063, lines: ['District'] },
  { name: 'West Ruislip', lat: 51.5694, lng: -0.4326, lines: ['Central'] },
  { name: 'Westbourne Park', lat: 51.5210, lng: -0.2010, lines: ['Hammersmith & City'] },
  { name: 'Westminster', lat: 51.5010, lng: -0.1254, lines: ['Circle','District','Jubilee'] },
  { name: 'White City', lat: 51.5122, lng: -0.2245, lines: ['Central'] },
  { name: 'Whitechapel', lat: 51.5194, lng: -0.0599, lines: ['District','Hammersmith & City','Overground','Elizabeth'] },
  { name: 'Willesden Green', lat: 51.5487, lng: -0.2222, lines: ['Jubilee'] },
  { name: 'Willesden Junction', lat: 51.5325, lng: -0.2411, lines: ['Bakerloo','Overground'] },
  { name: 'Wimbledon', lat: 51.4214, lng: -0.2064, lines: ['District','Northern','Tram'] },
  { name: 'Wimbledon Park', lat: 51.4325, lng: -0.1958, lines: ['District'] },
  { name: 'Wood Green', lat: 51.5976, lng: -0.1098, lines: ['Piccadilly'] },
  { name: 'Wood Lane', lat: 51.5094, lng: -0.2268, lines: ['Circle','Hammersmith & City'] },
  { name: 'Woodford', lat: 51.6075, lng: 0.0334, lines: ['Central'] },
  { name: 'Woodside Park', lat: 51.6231, lng: -0.1847, lines: ['Northern'] },
  { name: 'Woolwich', lat: 51.4985, lng: 0.0706, lines: ['DLR','Elizabeth'] },
  { name: 'Woolwich Arsenal', lat: 51.4900, lng: 0.0691, lines: ['Overground'] },
]

function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function getNearestStations(lat: number, lng: number, count = 4) {
  return TUBE_STATIONS
    .map(s => ({ ...s, metres: haversineMetres(lat, lng, s.lat, s.lng) }))
    .sort((a, b) => a.metres - b.metres)
    .slice(0, count)
    .map(s => ({ ...s, walkMins: Math.round(s.metres / 80) }))
}

interface NearbyListing {
  id: string
  address: string
  price: number
  latitude: number
  longitude: number
  bedrooms: number | null
  property_type: string | null
  images?: string
}

interface Props {
  latitude: number
  longitude: number
  address: string
  price: number
  nearbyListings?: NearbyListing[]
}

export default function PropertyMap({ latitude, longitude, address, price, nearbyListings = [] }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const nearestStations = getNearestStations(latitude, longitude)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      const viewed = getViewedListings()

      if (mapRef.current) return
      mapRef.current = L.map(mapContainer.current!, {
        center: [latitude, longitude],
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: false,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(mapRef.current)

      // Two layers for tube stations - roundel (zoom out) and label (zoom in)
      const stationMarkersRoundel: any[] = []
      const stationMarkersLabel: any[] = []

      TUBE_STATIONS.forEach(station => {
        const dots = station.lines.slice(0, 5).map(line =>
          `<div style="width:7px;height:7px;border-radius:50%;background:${LINE_COLOURS[line] || '#999'};border:1px solid rgba(255,255,255,0.8);"></div>`
        ).join('')

        // Roundel icon - shown when zoomed out
        const roundelIcon = L.divIcon({
          className: '',
          html: `<div style="width:22px;height:22px;border-radius:50%;background:white;border:2px solid #003688;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.2);cursor:pointer;">
            <div style="width:14px;height:3px;background:#E32017;"></div>
          </div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        })

        // Label icon - shown when zoomed in
        const labelIcon = L.divIcon({
          className: '',
          html: `<div style="display:flex;flex-direction:column;align-items:center;">
            <div style="background:white;border-radius:5px;padding:2px 6px;font-size:9px;color:#333;box-shadow:0 1px 4px rgba(0,0,0,0.15);border:1px solid rgba(0,0,0,0.1);white-space:nowrap;margin-bottom:2px;">${station.name}</div>
            <div style="display:flex;gap:2px;">${dots}</div>
          </div>`,
          iconSize: [120, 32],
          iconAnchor: [60, 32],
        })

        const linesText = station.lines.join(', ')
        const tooltip = `<strong>${station.name}</strong><br/><span style="font-size:11px;color:#666;">${linesText}</span>`

        const roundelMarker = L.marker([station.lat, station.lng], { icon: roundelIcon, zIndexOffset: 100 })
          .bindTooltip(tooltip, { direction: 'top', offset: [0, -14] })
        const labelMarker = L.marker([station.lat, station.lng], { icon: labelIcon, zIndexOffset: 100 })
          .bindTooltip(tooltip, { direction: 'top', offset: [0, -36] })

        stationMarkersRoundel.push(roundelMarker)
        stationMarkersLabel.push(labelMarker)
      })

      // Only show station labels when zoomed in to 15+
      mapRef.current.on('zoomend', () => {
        const zoom = mapRef.current.getZoom()
        if (zoom >= 15) {
          stationMarkersLabel.forEach(m => m.addTo(mapRef.current))
        } else {
          stationMarkersLabel.forEach(m => { try { mapRef.current.removeLayer(m) } catch {} })
        }
      })

      // Current listing marker - highest z-index
      const mainIcon = L.divIcon({
        className: '',
        html: `<div style="background:white;border-radius:99px;padding:5px 12px;font-size:12px;font-weight:600;color:#1a472a;box-shadow:0 2px 10px rgba(0,0,0,0.25);border:2px solid #1a472a;white-space:nowrap;font-family:Georgia,serif;position:relative;text-align:center;">£${price.toLocaleString()}/mo<div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #1a472a;"></div></div>`,
        iconSize: [130, 36],
        iconAnchor: [65, 43],
      })
      L.marker([latitude, longitude], { icon: mainIcon, zIndexOffset: 2000 }).addTo(mapRef.current)

      // Nearby listings - above stations, below current
      nearbyListings.forEach(nearby => {
        const lat = parseFloat(String(nearby.latitude))
        const lng = parseFloat(String(nearby.longitude))
        if (!lat || !lng) return

        const hasViewed = viewed.has(nearby.id)
        const bubbleBg = hasViewed ? '#c8c7c2' : 'white'
        const bubbleColor = hasViewed ? '#4a4a45' : '#6b6b67'
        const bubbleFontWeight = hasViewed ? '600' : '400'
        const tailColor = hasViewed ? '#c8c7c2' : 'white'

        let imgSrc = ''
        try {
          const imgs = typeof nearby.images === 'string' ? JSON.parse(nearby.images) : (nearby.images || [])
          imgSrc = Array.isArray(imgs) ? (imgs.find((u: string) => u && u.startsWith('http')) || '') : ''
        } catch {}

        const nearbyIcon = L.divIcon({
          className: '',
          html: `<div style="background:${bubbleBg};border-radius:99px;padding:4px 10px;font-size:11px;font-weight:${bubbleFontWeight};color:${bubbleColor};box-shadow:0 1px 6px rgba(0,0,0,0.15);border:1px solid rgba(0,0,0,0.12);white-space:nowrap;font-family:Georgia,serif;cursor:pointer;position:relative;text-align:center;">£${nearby.price.toLocaleString()}/mo<div style="position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid ${tailColor};"></div></div>`,
          iconSize: [110, 32],
          iconAnchor: [55, 37],
        })

        const popupContent = `
          <div style="width:200px;font-family:sans-serif;">
            ${imgSrc ? `<img src="${imgSrc}" referrerpolicy="no-referrer" style="width:100%;height:110px;object-fit:cover;border-radius:6px;margin-bottom:8px;" />` : '<div style="width:100%;height:80px;background:#f5f5f0;border-radius:6px;margin-bottom:8px;"></div>'}
            <div style="font-size:14px;font-weight:600;color:#1a1a18;font-family:Georgia,serif;margin-bottom:2px;">£${nearby.price.toLocaleString()}<span style="font-size:11px;color:#9e9e99;font-weight:400;font-family:sans-serif;">/mo</span></div>
            <div style="font-size:11px;color:#6b6b67;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${nearby.address}</div>
            <div style="font-size:11px;color:#9e9e99;margin-bottom:10px;">${nearby.bedrooms ? nearby.bedrooms + ' bed' : ''} ${nearby.property_type || ''}</div>
            <a href="/listings/${nearby.id}" target="_blank" onclick="window.__markViewed && window.__markViewed('${nearby.id}')" style="display:block;background:#1a472a;color:white;text-align:center;padding:7px;border-radius:7px;font-size:12px;text-decoration:none;">View listing</a>
          </div>
        `

        const marker = L.marker([lat, lng], { icon: nearbyIcon, zIndexOffset: 1000 })
        marker.bindPopup(popupContent, { maxWidth: 210, closeButton: true, offset: [0, -10] })
        marker.on('popupopen', () => {
          markAsViewed(nearby.id)
          const el = marker.getElement()
          if (el) {
            const bubble = el.querySelector('div') as HTMLElement
            if (bubble) {
              bubble.style.background = '#c8c7c2'
              bubble.style.color = '#4a4a45'
              bubble.style.fontWeight = '600'
              const tail = bubble.querySelector('div') as HTMLElement
              if (tail) tail.style.borderTopColor = '#c8c7c2'
            }
          }
        })
        marker.addTo(mapRef.current)
      })

      ;(window as any).__markViewed = (id: string) => markAsViewed(id)
    }

    initMap()
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [latitude, longitude])

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-800">Location</h2>
          {nearbyListings.length > 0 && (
            <p className="text-xs text-stone-400 mt-0.5">{nearbyListings.length} other listings on map</p>
          )}
        </div>
        <a href={'https://www.google.com/maps/search/?api=1&query=' + latitude + ',' + longitude} target="_blank" rel="noopener noreferrer" className="text-xs text-green-800 hover:underline">
          Open in Google Maps →
        </a>
      </div>
      <div ref={mapContainer} style={{height: '400px', zIndex: 0}} />
      <div className="px-5 py-4 border-t border-stone-100">
        <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-3">Nearest stations</h3>
        <div className="grid grid-cols-2 gap-3">
          {nearestStations.map(station => (
            <div key={station.name} className="flex items-start gap-2.5">
              <div className="flex-shrink-0 mt-0.5">
                <div style={{width:'18px',height:'18px',borderRadius:'50%',background:'white',border:'2px solid #003688',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <div style={{width:'10px',height:'2.5px',background:'#E32017'}} />
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-stone-700 truncate">{station.name}</div>
                <div className="text-xs text-stone-400">{station.walkMins} min walk</div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {station.lines.map((line: string) => (
                    <div key={line} style={{width:'8px',height:'8px',borderRadius:'50%',background:LINE_COLOURS[line]||'#999',border:'1px solid rgba(0,0,0,0.15)',flexShrink:0}} title={line} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-400 mt-3">Zoom in to see stations on map. Walk times are approximate.</p>
      </div>
    </div>
  )
}
