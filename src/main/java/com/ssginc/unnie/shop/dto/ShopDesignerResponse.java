package com.ssginc.unnie.shop.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShopDesignerResponse {
    // 디자이너 번호
    private int designerId;
    // 디자이너 사진
    private String designerThumbnail;
    // 디자이너 이름
    private String designerName;
    // 디자이너 소개
    private String designerIntroduction;
    // 업체 번호 (FK)
    private int designerShopId;


}
