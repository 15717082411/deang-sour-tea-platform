package com.deang.sourtea.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.deang.sourtea.model.Product;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ProductMapper extends BaseMapper<Product> {
}
