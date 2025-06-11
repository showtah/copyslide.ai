{
    "page_title": "TESLAのバッテリー開発体制",
    "theme": {
      "colors": {
        "primary_accent": "#9333ea",
        "secondary_accent": "#c084fc",
        "text_on_primary": "white",
        "default_text": "black",
        "border_light": "#d1d5db",
        "border_dark": "black",
        "grey": "#6b7280",
        "text_gray_700": "#374151", 
        "text_gray_600": "#4B5563", 
        "background_f3f4f6": "#f3f4f6",
        "organization_box_bg": "#f8fafc",
        "other_hires_bg": "#e5e7eb",
        "other_hires_text": "#374151"
      },
      "fonts": {
        "body": "'Noto Sans JP', sans-serif"
      },
      "font_sizes_tailwind": { 
        "h1": "text-4xl",
        "h2": "text-2xl",
        "h3_section_title": "text-xl",
        "description": "text-lg",
        "organization_box_text": "text-base",
        "details_list_title": "text-base",
        "details_list_item": "text-sm",
        "vertical_label": "text-sm",
        "header_tag": "text-xs", 
        "legend_item": "text-xs",
        "chart_y_axis_label": "text-xs",
        "chart_company_label": "text-xs",
        "chart_total_label": "text-xs",
        "chart_note": "text-xs",
        "footer_text": "text-xs",
        "unit_label": "text-xs",
        "chart_segment_value": "text-[10px]" 
      },
      "spacing_tailwind": { 
        "header_padding_x": "px-8",
        "header_padding_top": "pt-6",
        "header_padding_bottom": "pb-4",
        "main_padding_x": "px-8",
        "main_padding_y": "py-4",
        "footer_padding_x": "px-8",
        "footer_padding_y": "py-3",
        "grid_gap": "gap-8",
        "tag_gap": "gap-2",
        "organization_box_group_gap": "space-x-4", 
        "list_item_spacing": "space-y-1"
      }
    },
    "header": {
      "layout_classes": ["flex", "justify-between", "items-start", "mb-3"],
      "left_column": {
        "layout_classes": ["flex-grow", "pr-8"],
        "title_sub": {
          "text": "2. TESLAのバリューチェンから見た競争優位の\"源泉\"",
          "classes": ["text-2xl", "font-bold", "text-black", "mb-1"]
        },
        "title_main": {
          "text": "TESLAのバッテリー開発体制",
          "classes": ["text-4xl", "font-bold", "text-black"]
        }
      },
      "right_column": {
        "layout_classes": ["flex-shrink-0"],
        "tags_container_classes": ["flex", "flex-wrap", "gap-2", "justify-end"],
        "tags": [
          {"text": "企画", "is_highlighted": false, "classes_base": ["header-tag"]},
          {"text": "開発", "is_highlighted": true, "classes_base": ["header-tag"], "classes_highlighted": ["highlighted"]},
          {"text": "調達", "is_highlighted": false, "classes_base": ["header-tag"]},
          {"text": "製造", "is_highlighted": false, "classes_base": ["header-tag"]},
          {"text": "販売", "is_highlighted": false, "classes_base": ["header-tag"]},
          {"text": "アフターサポート", "is_highlighted": false, "classes_base": ["header-tag"]}
        ]
      },
      "description_section": {
        "text": "大学との共同研究やM&Aによる技術を獲得し、バッテリー人材を積極的に採用することで高性能・高効率なバッテリー開発体制を構築している",
        "classes": ["text-lg", "text-gray-700"]
      }
    },
    "main_content": {
      "layout_classes": ["flex-1", "px-8", "py-4"],
      "grid_container_classes": ["grid", "grid-cols-2", "gap-8", "h-full"],
      "columns": [
        {
          "id": "left_column_dev_capability",
          "layout_classes": ["flex", "flex-col"],
          "title": {
            "text": "バッテリー開発ケイパビリティ獲得の為の取り組み",
            "classes": ["text-xl", "font-bold", "text-center", "mb-6", "pb-2", "border-b", "border-gray-300"]
          },
          "sections": [
            {
              "type": "university_research",
              "container_classes": ["content-block", "flex"],
              "vertical_label": {
                "text": "大学との研究契約",
                "classes": ["vertical-label", "text-sm", "text-gray-600"]
              },
              "content_area_classes": ["flex-1"],
              "organization_box": {
                "text": "DALHOUSIE UNIVERSITY",
                "classes": ["organization-box", "text-base", "font-bold"]
              },
              "details_container_classes": ["mb-3"],
              "details_title": {
                "text": "共同研究によるバッテリー性能の高度化・人材獲得",
                "classes": ["text-base", "font-bold", "mb-2"],
                "inline_style": "color: var(--primary-accent);"
              },
              "list_items_container_classes": ["text-sm", "space-y-1", "text-gray-700"],
              "list_items_container_inline_style": "line-height: 1.4;",
              "list_items": [
                "- カナダ、ダルハウジー大学のリチウムイオン電池の世界的な権威であるJeff Dahn氏との研究契約を16年より締結",
                "- 同氏の研究は世界中のリチウムイオン電池に採用される等、強い影響力を持つ",
                "- TESLAは同研究室の卒業生の採用も行っている"
              ]
            },
            {
              "type": "m_and_a",
              "container_classes": ["content-block", "no-bottom-border", "flex"],
              "vertical_label": {
                "text": "M&Aによる技術獲得",
                "classes": ["vertical-label", "text-sm", "text-gray-600"]
              },
              "content_area_classes": ["flex-1"],
              "organization_boxes_container_classes": ["flex", "space-x-4", "mb-3"],
              "organization_boxes": [
                {"text": "HIBAR", "classes": ["organization-box", "text-base", "font-bold", "flex-1"]},
                {"text": "MAXWELL", "classes": ["organization-box", "text-base", "font-bold", "flex-1"]}
              ],
              "details_container_classes": ["mb-3"],
              "details_title": {
                "text": "買収を通じたバッテリー製造効率・性能の高度化",
                "classes": ["text-base", "font-bold", "mb-2"],
                "inline_style": "color: var(--primary-accent);"
              },
              "list_items_container_classes": ["text-sm", "space-y-1", "text-gray-700"],
              "list_items_container_inline_style": "line-height: 1.4;",
              "list_items": [
                "- 19年、バッテリーの高速製造システムを専門とする会社であるHibar Systems Ltd.を買収",
                "- 19年5月にバッテリーメーカーのMaxwell社を買収し、同社が保有するドライ電極技術を獲得"
              ],
              "action_button": {
                "text": "次頁詳細",
                "classes": ["button-primary"]
              }
            }
          ]
        },
        {
          "id": "right_column_hr_initiatives",
          "layout_classes": ["flex", "flex-col"],
          "title": {
            "text": "バッテリー関連人材採用への取り組み",
            "classes": ["text-xl", "font-bold", "text-center", "mb-6", "pb-2", "border-b", "border-gray-300"]
          },
          "charts": [
            {
              "id": "hp_hires_chart_section",
              "container_classes": ["mb-6"],
              "unit_label": {
                "text": "単位：人",
                "container_classes": ["flex", "justify-end", "mb-2"],
                "text_classes": ["text-xs", "text-gray-600"]
              },
              "legend": {
                "container_classes": ["mb-4", "space-y-1"],
                "items": [
                  {"label": "バッテリーエンジニア(設計・ソフトウェア開発等)", "color_style": "background-color: var(--primary-accent);", "text_classes": ["legend-item", "text-xs"]},
                  {"label": "その他バッテリー関連(生産、品質管理等)", "color_style": "background-color: var(--secondary-accent);", "text_classes": ["legend-item", "text-xs"]},
                  {"label": "その他採用職種", "color_style": "background-color: #e5e7eb; border: 1px solid var(--border-light);", "text_classes": ["legend-item", "text-xs"]}
                ]
              },
              "chart_visualization_container_classes": ["flex"],
              "y_axis_label": {
                "text": "各社公式HP採用人数",
                "classes": ["y-axis-label", "text-xs", "text-gray-600", "mr-2"]
              },
              "chart_data_area_classes": ["flex-1"],
              "data_rows": [
                {
                  "company": "Tesla", "total_value": 226,
                  "company_label_classes": ["w-12", "text-xs", "text-right", "mr-2"],
                  "bar_container_classes": ["flex-1", "flex", "h-[1.2rem]"],
                  "total_label_classes": ["w-8", "text-xs", "text-center", "ml-2"],
                  "segments": [
                    {"value_text": "153", "category_class": "other-hires", "width_style": "width: 67.7%;"},
                    {"value_text": "45", "category_class": "other-battery-related", "width_style": "width: 19.9%;"},
                    {"value_text": "28", "category_class": "battery-engineer", "width_style": "width: 12.4%;"}
                  ]
                },
                {
                  "company": "トヨタ", "total_value": 105,
                  "company_label_classes": ["w-12", "text-xs", "text-right", "mr-2"],
                  "bar_container_classes": ["flex-1", "flex", "h-[1.2rem]"],
                  "total_label_classes": ["w-8", "text-xs", "text-center", "ml-2"],
                  "segments": [
                    {"value_text": "97", "category_class": "other-hires", "width_style": "width: 42.9%;"},
                    {"value_text": "2", "category_class": "other-battery-related", "width_style": "width: 0.9%;"},
                    {"value_text": "6", "category_class": "battery-engineer", "width_style": "width: 2.7%;"}
                  ]
                },
                {
                  "company": "日産", "total_value": 13,
                  "company_label_classes": ["w-12", "text-xs", "text-right", "mr-2"],
                  "bar_container_classes": ["flex-1", "flex", "h-[1.2rem]"],
                  "total_label_classes": ["w-8", "text-xs", "text-center", "ml-2"],
                  "segments": [
                    {"value_text": "12", "category_class": "other-hires", "width_style": "width: 5.3%;"},
                    {"value_text": "1", "category_class": "battery-engineer", "width_style": "width: 0.4%;"}
                  ]
                },
                {
                  "company": "ホンダ", "total_value": 48,
                  "company_label_classes": ["w-12", "text-xs", "text-right", "mr-2"],
                  "bar_container_classes": ["flex-1", "flex", "h-[1.2rem]"],
                  "total_label_classes": ["w-8", "text-xs", "text-center", "ml-2"],
                  "segments": [
                    {"value_text": "45", "category_class": "other-hires", "width_style": "width: 19.9%;"},
                    {"value_text": "2", "category_class": "other-battery-related", "width_style": "width: 0.9%;"},
                    {"value_text": "1", "category_class": "battery-engineer", "width_style": "width: 0.4%;"}
                  ]
                }
              ],
              "note": {
                "text": "TESLAと比較し日系OEMのバッテリー関連の採用は僅か",
                "container_classes": ["text-center", "mt-3"],
                "text_classes": ["text-xs"],
                "inline_style": "color: var(--primary-accent);"
              }
            },
            {
              "id": "linkedin_chart_section",
              "chart_visualization_container_classes": ["flex"],
               "y_axis_label": {
                "text": "LinkedIn登録者数",
                "classes": ["y-axis-label", "text-xs", "text-gray-600", "mr-2"]
              },
              "chart_data_area_classes": ["flex-1"],
              "data_rows": [
                 {
                  "company": "Tesla", "total_value": "42,000",
                  "company_label_classes": ["w-12", "text-xs", "text-right", "mr-2"],
                  "bar_container_classes": ["flex-1", "flex", "items-center", "h-[1.2rem]"],
                  "total_label_classes": ["w-12", "text-xs", "text-center", "ml-2"],
                  "segments": [
                    {"value_text": "40,200 //", "category_class": "other-hires", "width_style": "width: 70%; min-width: 60px;"},
                    {"value_text": "700", "category_class": "other-battery-related", "width_style": "width: 10%;"},
                    {"value_text": "1,100", "category_class": "battery-engineer", "width_style": "width: 20%;"}
                  ]
                }
              ],
              "note": {
                "text": "※従業員全体は20年12月末時点で70,757人",
                "container_classes": ["text-right", "mt-2"],
                "text_classes": ["text-xs", "text-gray-600"]
              }
            }
          ]
        }
      ]
    },
    "footer": {
      "container_classes": ["px-8", "py-3", "border-t", "border-gray-200"],
      "grid_container_classes": ["grid", "grid-cols-12", "gap-2", "items-center"],
      "items": [
        {
          "text": "出所:現状のエンジニア数はLinkedIn登録数を参照、採用人数は各社公式HPより。いずれも4/21時点",
          "layout_classes": ["col-span-7"],
          "text_classes": ["text-xs"],
          "inline_style": "color: var(--grey);"
        },
        {
          "text": "Copyright © 2021 Accenture. All rights reserved.",
          "layout_classes": ["col-span-4", "text-right"],
          "text_classes": ["text-xs"],
          "inline_style": "color: var(--grey);"
        },
        {
          "text": "22",
          "layout_classes": ["col-span-1", "text-right"],
          "text_classes": ["text-xs"],
          "inline_style": "color: var(--grey);"
        }
      ]
    }
  }