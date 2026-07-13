package com.deang.sourtea.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;

@TableName("product")
public class Product {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long merchantId;
    private String name;
    private String category;
    private BigDecimal price;
    private Integer stock;
    private String status;

    public Product() {
    }

    public Product(Long id, Long merchantId, String name, String category, BigDecimal price, Integer stock, String status) {
        this.id = id;
        this.merchantId = merchantId;
        this.name = name;
        this.category = category;
        this.price = price;
        this.stock = stock;
        this.status = status;
    }

    public Long getId() { return id; }
    public Long getMerchantId() { return merchantId; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public BigDecimal getPrice() { return price; }
    public Integer getStock() { return stock; }
    public String getStatus() { return status; }
    public void setId(Long id) { this.id = id; }
    public void setMerchantId(Long merchantId) { this.merchantId = merchantId; }
    public void setName(String name) { this.name = name; }
    public void setCategory(String category) { this.category = category; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public void setStatus(String status) { this.status = status; }
    public void setStock(Integer stock) { this.stock = stock; }
}
