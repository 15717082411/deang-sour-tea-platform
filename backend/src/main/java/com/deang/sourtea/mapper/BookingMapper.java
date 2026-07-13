package com.deang.sourtea.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.deang.sourtea.model.Booking;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface BookingMapper extends BaseMapper<Booking> {
}
