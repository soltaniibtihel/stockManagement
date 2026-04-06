package com.ibtihel.app.services.user;

import com.ibtihel.app.entities.User;
import java.util.List;

public interface UserService {

    User createUser(User user);

    User updateUser(Long id, User user);

    void deleteUser(Long id);

    User getUserById(Long id);

    List<User> getAllUsers();

}

