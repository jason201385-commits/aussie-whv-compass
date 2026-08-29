/*
 * 澳打指南針 — 州／領地官方採收季節資料
 * Retrieved: 2026-08-29
 *
 * 只收錄能追溯到州／領地政府逐月資料的項目。這是農產品採收／供應月份，
 * 不等於當下保證有職缺；實際時間仍會受產區、品種與天候影響。
 */
(function () {
  "use strict";

  window.WHV_SEASONS = {
    retrieved: "2026-08-29",
    sources: {
      VIC: {
        name: "Agriculture Victoria — How to get a harvest job",
        url: "https://agriculture.vic.gov.au/crops-and-horticulture/Workforce-and-Harvest/how-to-get-a-harvest-job",
        pageDate: "2026-07-13"
      },
      TAS: {
        name: "NRE Tasmania — Harvest Jobs",
        url: "https://nre.tas.gov.au/agriculture/multifaceted-agriculture/harvest-jobs",
        pageDate: "2025-07-30"
      },
      NT: {
        name: "NT Government — Fruit availability and storage in NT",
        url: "https://nt.gov.au/industry/agriculture/food-crops-plants-and-quarantine/fruit-crops/fruit-availability-and-storage",
        pageDate: "未標示"
      }
    },
    states: [
      { code: "NSW", name: "新南威爾斯州", entries: [] },
      {
        code: "VIC",
        name: "維多利亞州",
        entries: [
          { crop: "柑橘", region: "Sunraysia、Swan Hill", months: [5, 6, 7, 8, 9], source: "VIC" },
          { crop: "莓果", region: "Yarra Valley、Mornington Peninsula", months: [11, 12, 1, 2, 3, 4], source: "VIC" },
          { crop: "櫻桃", region: "North East Victoria、Goulburn Valley、Yarra Valley、Dandenongs、Sunraysia", months: [11, 12, 1], source: "VIC" },
          { crop: "蔬菜", region: "Sunraysia、Werribee、East and West Gippsland", months: [10, 11, 12, 1, 2, 3], source: "VIC" },
          { crop: "夏季水果", region: "Swan Hill、Goulburn Valley", months: [11, 12, 1, 2, 3, 4, 5], source: "VIC" },
          { crop: "蘋果與梨", region: "Goulburn Valley、Yarra Valley", months: [1, 2, 3, 4, 5], source: "VIC" },
          { crop: "鮮食葡萄", region: "Sunraysia、Swan Hill", months: [1, 2, 3, 4, 5], source: "VIC" },
          { crop: "乾果", region: "Sunraysia", months: [1, 2, 3, 4], source: "VIC" },
          { crop: "瓜類", region: "Sunraysia", months: [12, 1, 2, 3, 4], source: "VIC" },
          { crop: "穀物", region: "產區由北往南開始採收", months: [10, 11, 12], source: "VIC" },
          { crop: "剪羊毛旺季", region: "Warrnambool 至 Wodonga 一帶", months: [9, 10, 11, 12], source: "VIC" }
        ]
      },
      { code: "QLD", name: "昆士蘭州", entries: [] },
      { code: "SA", name: "南澳州", entries: [] },
      { code: "WA", name: "西澳州", entries: [] },
      {
        code: "TAS",
        name: "塔斯馬尼亞州",
        entries: [
          { crop: "蘋果", region: "北部、西北部、南部", months: [2, 3, 4, 5], source: "TAS" },
          { crop: "櫻桃", region: "北部、西北部、南部", months: [12, 1, 2], source: "TAS" },
          { crop: "梨", region: "北部、南部", months: [2, 3], source: "TAS" },
          { crop: "藍莓", region: "北部、西北部、南部", months: [12, 1, 2, 3, 4, 5], source: "TAS" },
          { crop: "覆盆莓", region: "北部、西北部、南部", months: [12, 1, 2, 3, 4, 5], source: "TAS" },
          { crop: "草莓", region: "北部、西北部、南部", months: [10, 11, 12, 1, 2, 3, 4, 5], source: "TAS" },
          { crop: "釀酒葡萄採收", region: "北部、西北部、南部", months: [2, 3, 4, 5], source: "TAS" },
          { crop: "釀酒葡萄修剪", region: "北部、西北部、南部", months: [6, 7, 8], source: "TAS" },
          { crop: "甜菜根", region: "北部、西北部", months: [3, 4, 5, 6, 7, 8], source: "TAS" },
          { crop: "青花菜", region: "北部、西北部", months: [11, 12, 1, 2, 3, 4, 5, 6], source: "TAS" },
          { crop: "球芽甘藍", region: "北部、西北部", months: [3, 4, 5, 6, 7, 8, 9], source: "TAS" },
          { crop: "胡蘿蔔", region: "北部、西北部", months: [1, 2, 3, 4, 5, 6, 7, 8], source: "TAS" },
          { crop: "白花椰菜", region: "北部", months: [1, 2, 3, 4, 5, 6], source: "TAS" },
          { crop: "葉菜種植與採收", region: "北部、南部", months: [9, 10, 11, 12, 1, 2, 3, 4, 5, 6], source: "TAS" },
          { crop: "種薯", region: "北部、西北部、南部", months: [2, 3, 4, 5], source: "TAS" },
          { crop: "加工馬鈴薯", region: "北部、西北部、南部", months: [2, 3, 4, 5, 6, 7, 8], source: "TAS" },
          { crop: "南瓜", region: "北部、西北部", months: [4, 5], source: "TAS" },
          { crop: "蕪菁甘藍", region: "北部、西北部", months: [1, 2, 3, 4, 5, 6], source: "TAS" },
          { crop: "啤酒花採收", region: "西北部、南部", months: [2, 3], source: "TAS" },
          { crop: "啤酒花牽引與整枝", region: "西北部、南部", months: [6, 7, 8, 9, 10, 11], source: "TAS" },
          { crop: "棚內剪羊毛助手", region: "北部、南部", months: [4, 5, 6, 7, 8], source: "TAS" },
          { crop: "剪羊毛與修剪", region: "北部、南部", months: [11, 12, 1, 2, 3, 4, 5, 6, 7, 8], source: "TAS" },
          { crop: "青貯與乾草", region: "北部、西北部、南部", months: [10, 11, 12, 1, 2], source: "TAS" },
          { crop: "犢牛飼育", region: "北部、西北部、南部", months: [8, 9, 10, 11], source: "TAS" },
          { crop: "杏桃", region: "南部", months: [1, 2], source: "TAS" }
        ]
      },
      {
        code: "NT",
        name: "北領地",
        entries: [
          { crop: "酪梨", region: "Darwin、Katherine", months: [12, 1, 2, 3], source: "NT" },
          { crop: "香蕉", region: "Darwin、Katherine", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], source: "NT" },
          { crop: "腰果", region: "Darwin、Katherine", months: [10, 11], source: "NT" },
          { crop: "椰子", region: "Darwin", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], source: "NT" },
          { crop: "棗", region: "Alice Springs", months: [2, 3, 4, 5], source: "NT" },
          { crop: "葡萄柚", region: "Darwin、Katherine、Alice Springs", months: [2, 3, 4, 5, 6, 7], source: "NT" },
          { crop: "哈密瓜", region: "Darwin、Katherine", months: [5, 6, 7, 8, 9, 10], source: "NT" },
          { crop: "蜜瓜", region: "Darwin、Katherine", months: [3, 4, 5, 6, 7, 8, 9, 10], source: "NT" },
          { crop: "檸檬與萊姆", region: "Darwin、Katherine、Alice Springs", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], source: "NT" },
          { crop: "芒果", region: "Darwin、Katherine", months: [9, 10, 11, 12], source: "NT" },
          { crop: "橙", region: "Alice Springs", months: [3, 4, 5, 6, 7, 8], source: "NT" },
          { crop: "木瓜", region: "Darwin、Katherine", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], source: "NT" },
          { crop: "百香果", region: "Darwin、Katherine、Alice Springs", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], source: "NT" },
          { crop: "鳳梨", region: "Darwin", months: [10, 11, 12, 1, 2, 3], source: "NT" },
          { crop: "紅毛丹", region: "Darwin", months: [11, 12, 1, 2], source: "NT" },
          { crop: "岩瓜", region: "Darwin、Katherine", months: [5, 6, 7, 8, 9, 10], source: "NT" },
          { crop: "草莓", region: "Alice Springs", months: [8, 9, 10, 11], source: "NT" },
          { crop: "鮮食葡萄", region: "Katherine、Alice Springs", months: [11, 12, 1], source: "NT" },
          { crop: "西瓜", region: "Darwin、Katherine", months: [5, 6, 7, 8, 9, 10], source: "NT" }
        ]
      },
      { code: "ACT", name: "澳洲首都領地", entries: [] }
    ]
  };
}());
