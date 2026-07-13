package com.deang.sourtea.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.deang.sourtea.model.Order;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface OrderMapper extends BaseMapper<Order> {
}
