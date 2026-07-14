package com.deang.sourtea;

import com.baomidou.mybatisplus.annotation.TableField;
import com.deang.sourtea.model.Merchant;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MerchantMappingTest {
    @Test
    void statusMapsToAuditStatusColumn() throws Exception {
        TableField mapping = Merchant.class.getDeclaredField("status").getAnnotation(TableField.class);

        assertThat(mapping).isNotNull();
        assertThat(mapping.value()).isEqualTo("audit_status");
    }
}
