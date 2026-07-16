export default async function handler(req, res) {
  // Define only New Zealand and its official shipping states/regions
  const geopoliticalCountries = {
    NZ: {
      name: "New Zealand",
      states: {
        AUK: "Auckland",
        WKO: "Waikato",
        WGN: "Wellington",
        CAN: "Canterbury",
        OTA: "Otago",
        BPL: "Bay of Plenty",
        GIS: "Gisborne",
        HB: "Hawke's Bay",
        MWT: "Manawatu-Wanganui",
        MBH: "Marlborough",
        NSN: "Nelson",
        NTL: "Northland",
        STC: "Southland",
        TKI: "Taranaki",
        TAS: "Tasman",
        WTC: "West Coast"
      }
    }
  };

  // Instantly return New Zealand geopolitical data
  return res.status(200).json(geopoliticalCountries);
}