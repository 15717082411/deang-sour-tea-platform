package com.deang.sourtea.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("content")
public class Content {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String title;
    private String category;
    private String summary;
    private String status;

    public Content() {
    }

    public Content(Long id, String title, String category, String summary, String status) {
        this.id = id;
        this.title = title;
        this.category = category;
        this.summary = summary;
        this.status = status;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getCategory() { return category; }
    public String getSummary() { return summary; }
    public String getStatus() { return status; }
    public void setId(Long id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setCategory(String category) { this.category = category; }
    public void setSummary(String summary) { this.summary = summary; }
    public void setStatus(String status) { this.status = status; }
}
