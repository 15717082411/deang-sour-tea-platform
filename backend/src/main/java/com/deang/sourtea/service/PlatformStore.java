package com.deang.sourtea.service;

import com.deang.sourtea.model.Booking;
import com.deang.sourtea.model.Content;
import com.deang.sourtea.model.Merchant;
import com.deang.sourtea.model.Order;
import com.deang.sourtea.model.Product;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface PlatformStore {
    List<Product> listProducts();
    Product createProduct(Product product);
    Optional<Product> approveProduct(Long id);
    List<Merchant> listMerchants();
    Optional<Merchant> approveMerchant(Long id);
    List<Content> listContents();
    Content createContent(Content content);
    Order createOrder(Long userId, List<Long> productIds);
    List<Order> listOrdersByUserId(Long userId);
    Booking createBooking(Long userId, LocalDate date, Integer peopleCount, String phone);
    List<Booking> listBookingsByUserId(Long userId);
    Optional<Booking> verifyBooking(String code);
    Map<String, Object> dashboard();
}
