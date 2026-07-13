package com.deang.sourtea.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDate;

@TableName("booking")
public class Booking {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    @TableField("booking_date")
    private LocalDate date;
    private Integer peopleCount;
    private String phone;
    private String verifyCode;
    private String status;

    public Booking() {
    }

    public Booking(Long id, Long userId, LocalDate date, Integer peopleCount, String phone, String verifyCode) {
        this.id = id;
        this.userId = userId;
        this.date = date;
        this.peopleCount = peopleCount;
        this.phone = phone;
        this.verifyCode = verifyCode;
        this.status = "PENDING";
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public LocalDate getDate() { return date; }
    public Integer getPeopleCount() { return peopleCount; }
    public String getPhone() { return phone; }
    public String getVerifyCode() { return verifyCode; }
    public String getStatus() { return status; }
    public void setId(Long id) { this.id = id; }
    public void setUserId(Long userId) { this.userId = userId; }
    public void setDate(LocalDate date) { this.date = date; }
    public void setPeopleCount(Integer peopleCount) { this.peopleCount = peopleCount; }
    public void setPhone(String phone) { this.phone = phone; }
    public void setVerifyCode(String verifyCode) { this.verifyCode = verifyCode; }
    public void setStatus(String status) { this.status = status; }
}
