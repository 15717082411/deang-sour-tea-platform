package com.deang.sourtea.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@TableName("order_main")
public class Order {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String orderNo;
    private Long userId;
    private BigDecimal totalAmount;
    private String status;
    @TableField(exist = false)
    private List<Long> productIds;
    private LocalDateTime createdAt;

    public Order() {
    }

    public Order(Long id, String orderNo, Long userId, BigDecimal totalAmount, String status, List<Long> productIds) {
        this.id = id;
        this.orderNo = orderNo;
        this.userId = userId;
        this.totalAmount = totalAmount;
        this.status = status;
        this.productIds = productIds;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getOrderNo() { return orderNo; }
    public Long getUserId() { return userId; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public String getStatus() { return status; }
    public List<Long> getProductIds() { return productIds; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setId(Long id) { this.id = id; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }
    public void setUserId(Long userId) { this.userId = userId; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public void setStatus(String status) { this.status = status; }
    public void setProductIds(List<Long> productIds) { this.productIds = productIds; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
