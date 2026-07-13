package com.deang.sourtea.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("mysql")
@MapperScan("com.deang.sourtea.mapper")
public class MybatisConfig {
}
