package com.deang.sourtea.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("merchant")
public class Merchant {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String shopName;
    private String contact;
    private String status;

    public Merchant() {
    }

    public Merchant(Long id, String shopName, String contact, String status) {
        this.id = id;
        this.shopName = shopName;
        this.contact = contact;
        this.status = status;
    }

    public Long getId() { return id; }
    public String getShopName() { return shopName; }
    public String getContact() { return contact; }
    public String getStatus() { return status; }
    public void setId(Long id) { this.id = id; }
    public void setShopName(String shopName) { this.shopName = shopName; }
    public void setContact(String contact) { this.contact = contact; }
    public void setStatus(String status) { this.status = status; }
}
